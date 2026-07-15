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
import { MapCoordinatePicker } from '../components/MapCoordinatePicker';
import { toast } from 'sonner';
import type { LeasedLandOut } from '../../types/models';

type FormData = Omit<LeasedLandOut, 'id' | 'createdBy' | 'createdAt' | 'updatedAt'>;

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


export const AddLeasedLandOutPage: React.FC = () => {
  const navigate = useNavigate();
  const { addLeasedLandOut } = useData();
  const { currentUser } = useAuth();
  const { t } = useTranslation();
  const [coordinates, setCoordinates] = useState('');
  const selectedCoordinates = parseCoordinatesString(coordinates);

  const handleCoordinatesChange = React.useCallback((selected: Coordinates) => {
    setCoordinates(`${selected.latitude.toFixed(6)}, ${selected.longitude.toFixed(6)}`);
  }, []);
  const [contractFiles, setContractFiles] = useState<File[]>([]);
  const [planFiles, setPlanFiles] = useState<File[]>([]);
  const [siteFiles, setSiteFiles] = useState<File[]>([]);

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>();

  const onSubmit = (data: FormData) => {
    if (!currentUser) {
      toast.error('يجب تسجيل الدخول أولاً');
      return;
    }

    addLeasedLandOut({
      ...data,
      tenant: {
        name: data.tenant.name,
        commercialRegistration: data.tenant.commercialRegistration,
        entityRepresentative: data.tenant.entityRepresentative,
        identityNumber: data.tenant.identityNumber,
        nationality: data.tenant.nationality,
        mobileNumber: data.tenant.mobileNumber,
      },
      contractStartDate: new Date(data.contractStartDate),
      area: Number(data.area),
      rentAmount: data.rentAmount ? Number(data.rentAmount) : undefined,
      coordinates: coordinates || undefined,
      createdBy: currentUser.uid
    });

    toast.success('تم إضافة الأرض المؤجرة بنجاح');
    navigate('/lands/leased-out');
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">إضافة أرض مؤجرة (من الجامعة)</h1>
          <p className="text-muted-foreground">تسجيل عقد تأجير أرض للغير</p>
        </div>
        <Button variant="outline" onClick={() => navigate('/lands/leased-out')}>
          <X className="ml-2 h-4 w-4" />
          إلغاء
        </Button>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <Tabs defaultValue="tenant" className="space-y-4">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="tenant">بيانات المستأجر</TabsTrigger>
            <TabsTrigger value="contract">بيانات العقد</TabsTrigger>
            <TabsTrigger value="land">بيانات الأرض</TabsTrigger>
            <TabsTrigger value="notes">الملاحظات</TabsTrigger>
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
                    <Input {...register('tenant.name', { required: 'مطلوب' })} placeholder="اسم المستأجر" />
                    {errors.tenant?.name && <p className="text-sm text-destructive">{errors.tenant.name.message}</p>}
                  </div>
                  <div className="space-y-2">
                    <Label>السجل التجاري</Label>
                    <Input {...register('tenant.commercialRegistration')} placeholder="رقم السجل التجاري" />
                  </div>
                  <div className="space-y-2">
                    <Label>ممثل الجهة</Label>
                    <Input {...register('tenant.entityRepresentative')} placeholder="اسم ممثل الجهة" />
                  </div>
                  <div className="space-y-2">
                    <Label>رقم الهوية</Label>
                    <Input {...register('tenant.identityNumber')} placeholder="رقم الهوية الوطنية" />
                  </div>
                  <div className="space-y-2">
                    <Label>الجنسية</Label>
                    <Input {...register('tenant.nationality')} placeholder="الجنسية" />
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
                    <Input {...register('contractNumber', { required: 'مطلوب' })} placeholder="رقم العقد" />
                  </div>
                  <div className="space-y-2">
                    <Label>تاريخ بداية العقد *</Label>
                    <Input type="date" {...register('contractStartDate', { required: 'مطلوب' })} />
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
                  <div className="space-y-2">
                    <Label>رقم القطعة *</Label>
                    <Input {...register('plotNumber', { required: 'مطلوب' })} />
                  </div>
                  <div className="space-y-2">
                    <Label>رقم المخطط *</Label>
                    <Input {...register('planNumber', { required: 'مطلوب' })} />
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
                    <div className="mt-3">
                      <MapCoordinatePicker
                        coordinates={selectedCoordinates}
                        onChange={handleCoordinatesChange}
                      />
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
          <Button type="button" variant="outline" onClick={() => navigate('/lands/leased-out')}>إلغاء</Button>
          <Button type="submit">
            <Save className="ml-2 h-4 w-4" />
            حفظ
          </Button>
        </div>
      </form>
    </div>
  );
};
