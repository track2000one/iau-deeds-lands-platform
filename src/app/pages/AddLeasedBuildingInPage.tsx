import React, { useState } from 'react';
import { useNavigate } from 'react-router';
import { useData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { Save, X, Building, User, FileText, DollarSign, MapPin } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { FileUploadZone } from '../components/FileUploadZone';
import { MapCoordinatePicker } from '../components/MapCoordinatePicker';
import { toast } from 'sonner';
import type { LeasedBuildingIn } from '../../types/models';

type FormData = Omit<LeasedBuildingIn, 'id' | 'createdBy' | 'createdAt' | 'updatedAt'>;

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


export const AddLeasedBuildingInPage: React.FC = () => {
  const navigate = useNavigate();
  const { addLeasedBuildingIn } = useData();
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

    addLeasedBuildingIn({
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

    toast.success('تم إضافة المبنى المستأجر بنجاح');
    navigate('/buildings/leased-in');
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">إضافة مبنى مستأجر (للجامعة)</h1>
          <p className="text-muted-foreground">تسجيل عقد استئجار مبنى من الغير</p>
        </div>
        <Button variant="outline" onClick={() => navigate('/buildings/leased-in')}>
          <X className="ml-2 h-4 w-4" />
          إلغاء
        </Button>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <Tabs defaultValue="owner" className="space-y-4">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="owner">بيانات المالك</TabsTrigger>
            <TabsTrigger value="contract">بيانات العقد</TabsTrigger>
            <TabsTrigger value="building">بيانات المبنى</TabsTrigger>
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
                    <Input {...register('owner.name', { required: 'مطلوب' })} />
                    {errors.owner?.name && <p className="text-sm text-destructive">{errors.owner.name.message}</p>}
                  </div>
                  <div className="space-y-2">
                    <Label>السجل التجاري</Label>
                    <Input {...register('owner.commercialRegistration')} />
                  </div>
                  <div className="space-y-2">
                    <Label>ممثل الجهة</Label>
                    <Input {...register('owner.entityRepresentative')} />
                  </div>
                  <div className="space-y-2">
                    <Label>رقم الهوية</Label>
                    <Input {...register('owner.identityNumber')} />
                  </div>
                  <div className="space-y-2">
                    <Label>الجنسية</Label>
                    <Input {...register('owner.nationality')} />
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
                    <Label>اسم الموقع *</Label>
                    <Input {...register('locationName', { required: 'مطلوب' })} />
                  </div>
                  <div className="space-y-2">
                    <Label>المساحة (م²) *</Label>
                    <Input type="number" step="any" {...register('area', { required: 'مطلوب' })} />
                  </div>
                  <div className="space-y-2">
                    <Label>المنطقة *</Label>
                    <Input {...register('region', { required: 'مطلوب' })} />
                  </div>
                  <div className="space-y-2">
                    <Label>المدينة</Label>
                    <Input {...register('city')} />
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
          <Button type="button" variant="outline" onClick={() => navigate('/buildings/leased-in')}>إلغاء</Button>
          <Button type="submit">
            <Save className="ml-2 h-4 w-4" />
            حفظ
          </Button>
        </div>
      </form>
    </div>
  );
};
