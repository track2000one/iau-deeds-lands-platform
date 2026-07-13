import React, { useState } from 'react';
import { useNavigate } from 'react-router';
import { useData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { Save, X, Building, Upload, FileText, User, DollarSign, MapPin } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { FileUploadZone } from '../components/FileUploadZone';
import { toast } from 'sonner';
import type { LeasedBuildingOut } from '../../types/models';

type FormData = Omit<LeasedBuildingOut, 'id' | 'createdBy' | 'createdAt' | 'updatedAt'>;

export const AddLeasedBuildingOutPage: React.FC = () => {
  const navigate = useNavigate();
  const { addLeasedBuildingOut } = useData();
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

    addLeasedBuildingOut({
      ...data,
      tenant: {
        name: data.tenant.name,
        commercialRegistration: data.tenant.commercialRegistration,
        entityRepresentative: data.tenant.entityRepresentative,
        identityNumber: data.tenant.identityNumber,
        nationality: data.tenant.nationality,
        mobileNumber: data.tenant.mobileNumber,
      },
      area: Number(data.area),
      rentAmount: data.rentAmount ? Number(data.rentAmount) : undefined,
      coordinates: coordinates || undefined,
      createdBy: currentUser.uid
    });

    toast.success('تم إضافة المبنى المؤجر بنجاح');
    navigate('/buildings/leased-out');
  };

  const cities = ['الدمام', 'الخبر', 'الظهران', 'القطيف', 'الجبيل', 'الأحساء', 'حفر الباطن'];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">إضافة مبنى مؤجر (من الجامعة)</h1>
          <p className="text-muted-foreground">تسجيل عقد تأجير مبنى للغير</p>
        </div>
        <Button variant="outline" onClick={() => navigate('/buildings/leased-out')}>
          <X className="ml-2 h-4 w-4" />
          إلغاء
        </Button>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <Tabs defaultValue="tenant" className="space-y-4">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="tenant">بيانات المستأجر</TabsTrigger>
            <TabsTrigger value="contract">بيانات العقد</TabsTrigger>
            <TabsTrigger value="building">بيانات المبنى</TabsTrigger>
            <TabsTrigger value="notes">ملاحظات</TabsTrigger>
            <TabsTrigger value="attachments">{t('attachments.title')}</TabsTrigger>
          </TabsList>

          <TabsContent value="tenant">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  معلومات المستأجر
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>اسم المستأجر *</Label>
                    <Input {...register('tenant.name', { required: 'مطلوب' })} />
                    {errors.tenant?.name && <p className="text-sm text-destructive">{errors.tenant.name.message}</p>}
                  </div>
                  <div className="space-y-2">
                    <Label>السجل التجاري</Label>
                    <Input {...register('tenant.commercialRegistration')} />
                  </div>
                  <div className="space-y-2">
                    <Label>ممثل الجهة</Label>
                    <Input {...register('tenant.entityRepresentative')} />
                  </div>
                  <div className="space-y-2">
                    <Label>رقم الهوية</Label>
                    <Input {...register('tenant.identityNumber')} />
                  </div>
                  <div className="space-y-2">
                    <Label>الجنسية</Label>
                    <Input {...register('tenant.nationality')} />
                  </div>
                  <div className="space-y-2">
                    <Label>رقم الجوال</Label>
                    <Input {...register('tenant.mobileNumber')} placeholder="05xxxxxxxx" />
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
                    <Input {...register('contractNumber', { required: 'مطلوب' })} />
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

          <TabsContent value="building">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building className="h-5 w-5" />
                  بيانات المبنى
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>رقم المبنى *</Label>
                    <Input {...register('buildingNumber', { required: 'مطلوب' })} />
                  </div>
                  <div className="space-y-2">
                    <Label>رقم المخطط</Label>
                    <Input {...register('planNumber')} />
                  </div>
                  <div className="space-y-2">
                    <Label>اسم الموقع *</Label>
                    <Input {...register('locationName', { required: 'مطلوب' })} />
                  </div>
                  <div className="space-y-2">
                    <Label>المساحة (م²) *</Label>
                    <Input type="number" step="0.01" {...register('area', { required: 'مطلوب' })} />
                  </div>
                  <div className="space-y-2">
                    <Label>المدينة *</Label>
                    <select {...register('city', { required: 'مطلوب' })} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                      <option value="">اختر المدينة</option>
                      {cities.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label>الحي</Label>
                    <Input {...register('district')} />
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
          <Button type="button" variant="outline" onClick={() => navigate('/buildings/leased-out')}>إلغاء</Button>
          <Button type="submit">
            <Save className="ml-2 h-4 w-4" />
            حفظ
          </Button>
        </div>
      </form>
    </div>
  );
};
