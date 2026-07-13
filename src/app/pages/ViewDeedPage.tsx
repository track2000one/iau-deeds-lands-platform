import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { useTranslation } from 'react-i18next';
import { useDeeds } from '../../context/DeedContext';
import {
  ArrowLeft,
  Edit,
  Trash2,
  MapPin,
  FileText,
  Image as ImageIcon,
  Map as MapIcon,
  PlusCircle,
  Download,
  Eye,
  X,
  Upload,
  Save,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Separator } from '../components/ui/separator';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { NativeSelect } from '../components/ui/native-select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../components/ui/alert-dialog';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '../components/ui/dialog';
import { toast } from 'sonner';

type EditFormState = {
  deedNumber: string;
  deedDate: string;
  propertyDescription: string;
  plotNumber: string;
  planNumber: string;
  area: string;
  region: string;
  city: string;
  district: string;
  location: string;
  usageType: string;
  isPlanned: boolean;
  latitude: string;
  longitude: string;
  notes: string;
};

const usageTypes = ['سكني', 'تجاري', 'صناعي', 'استثماري', 'تعليمي', 'زراعي', 'حكومي'];
const cities = ['الدمام', 'الخبر', 'الظهران', 'القطيف', 'الجبيل', 'الأحساء', 'حفر الباطن'];

const formatDateForInput = (value: any) => {
  if (!value) return new Date().toISOString().split('T')[0];

  try {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return new Date().toISOString().split('T')[0];
    }
    return date.toISOString().split('T')[0];
  } catch {
    return new Date().toISOString().split('T')[0];
  }
};

export const ViewDeedPage: React.FC = () => {
  const navigate = useNavigate();
  const { deedId } = useParams<{ deedId: string }>();
  const { t } = useTranslation();

  const {
    getDeedById,
    deleteDeed,
    updateDeed,
    addAttachment,
    deleteAttachment,
  } = useDeeds() as any;

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [uploadTab, setUploadTab] = useState<'deed' | 'site' | 'plan' | 'additional'>('deed');

  const [isEditing, setIsEditing] = useState(false);
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [editForm, setEditForm] = useState<EditFormState>({
    deedNumber: '',
    deedDate: new Date().toISOString().split('T')[0],
    propertyDescription: '',
    plotNumber: '',
    planNumber: '',
    area: '',
    region: '',
    city: '',
    district: '',
    location: '',
    usageType: '',
    isPlanned: false,
    latitude: '',
    longitude: '',
    notes: '',
  });

  const deed = deedId ? getDeedById(deedId) : null;

  const startEdit = () => {
    if (!deed) return;

    setEditForm({
      deedNumber: deed.deedNumber || '',
      deedDate: formatDateForInput(deed.deedDate),
      propertyDescription: deed.propertyDescription || '',
      plotNumber: deed.plotNumber || '',
      planNumber: deed.planNumber || '',
      area: String(deed.area || ''),
      region: deed.region || '',
      city: deed.city || '',
      district: deed.district || '',
      location: deed.location || '',
      usageType: deed.usageType || '',
      isPlanned: Boolean(deed.isPlanned),
      latitude:
        deed.coordinates && typeof deed.coordinates.latitude === 'number'
          ? String(deed.coordinates.latitude)
          : '',
      longitude:
        deed.coordinates && typeof deed.coordinates.longitude === 'number'
          ? String(deed.coordinates.longitude)
          : '',
      notes: deed.notes || '',
    });

    setIsEditing(true);
  };

  const cancelEdit = () => {
    setIsEditing(false);
  };

  const updateEditField = (field: keyof EditFormState, value: any) => {
    setEditForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const validateEditForm = () => {
    if (!editForm.deedNumber.trim()) {
      toast.error('رقم الصك مطلوب');
      return false;
    }

    if (!editForm.deedDate) {
      toast.error('تاريخ الصك مطلوب');
      return false;
    }

    if (!editForm.propertyDescription.trim()) {
      toast.error('بيان العقار مطلوب');
      return false;
    }

    if (!editForm.area || Number(editForm.area) <= 0) {
      toast.error('المساحة يجب أن تكون أكبر من صفر');
      return false;
    }

    if (!editForm.city.trim()) {
      toast.error('المدينة مطلوبة');
      return false;
    }

    if (!editForm.district.trim()) {
      toast.error('الحي مطلوب');
      return false;
    }

    return true;
  };

  const saveEdit = async () => {
    if (!deedId || !deed) return;
    if (!validateEditForm()) return;

    setIsSavingEdit(true);

    try {
      const latitude = editForm.latitude ? Number(editForm.latitude) : null;
      const longitude = editForm.longitude ? Number(editForm.longitude) : null;

      const coordinates =
        latitude !== null &&
        longitude !== null &&
        !Number.isNaN(latitude) &&
        !Number.isNaN(longitude)
          ? { latitude, longitude }
          : undefined;

      const payload: any = {
        deedNumber: editForm.deedNumber.trim(),
        deedDate: editForm.deedDate,
        propertyDescription: editForm.propertyDescription.trim(),
        plotNumber: editForm.plotNumber.trim(),
        planNumber: editForm.planNumber.trim(),
        area: Number(editForm.area || 0),
        region: editForm.region.trim(),
        city: editForm.city.trim(),
        district: editForm.district.trim(),
        location: editForm.location.trim(),
        usageType: editForm.usageType,
        isPlanned: editForm.isPlanned,
        notes: editForm.notes.trim(),
      };

      if (coordinates) {
        payload.coordinates = coordinates;
      } else {
        payload.coordinates = undefined;
      }

      await updateDeed(deedId, payload);

      toast.success('تم حفظ التعديلات بنجاح');
      setIsEditing(false);
    } catch (error) {
      console.error('Error updating deed:', error);
      toast.error('فشل في حفظ التعديلات');
    } finally {
      setIsSavingEdit(false);
    }
  };

  const handleDelete = async () => {
    if (!deedId) return;

    try {
      await deleteDeed(deedId);
      toast.success(t('deed.deletedSuccessfully'));
      navigate('/deeds');
    } catch (error) {
      console.error('Error deleting deed:', error);
      toast.error('فشل في حذف الصك');
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0 || !deedId) return;

    Array.from(files).forEach((file) => {
      const reader = new FileReader();

      reader.onload = (e) => {
        const fileUrl = e.target?.result as string;

        addAttachment(deedId, {
          fileName: file.name,
          originalName: file.name,
          fileSize: file.size,
          fileType: file.type || 'application/octet-stream',
          attachmentType: uploadTab,
          fileUrl,
        });

        toast.success(`تم رفع ${file.name} بنجاح`);
      };

      reader.onerror = () => {
        toast.error(`فشل في رفع ${file.name}`);
      };

      reader.readAsDataURL(file);
    });

    event.target.value = '';
  };

  const getAttachmentsByType = (type: string) => {
    return Array.isArray(deed?.attachments)
      ? deed.attachments.filter((att: any) => att.attachmentType === type)
      : [];
  };

  const formatFileSize = (bytes: number) => {
    if (!bytes) return '0 Bytes';

    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  };

  const openAttachment = (attachment: any) => {
    if (!attachment?.fileUrl && !attachment?.localPath) {
      toast.error('رابط أو مسار المرفق غير متوفر');
      return;
    }

    if (attachment.localPath && window.localAPI?.openPath) {
      window.localAPI.openPath(attachment.localPath);
      return;
    }

    if (attachment.fileType?.startsWith('image/')) {
      setPreviewImage(attachment.fileUrl);
      return;
    }

    window.open(attachment.fileUrl, '_blank', 'noopener,noreferrer');
  };

  const downloadAttachment = async (attachment: any) => {
    try {
      const fileName =
        attachment.originalName ||
        attachment.fileName ||
        'attachment';

      if (attachment.localPath && window.localAPI?.openPath) {
        await window.localAPI.openPath(attachment.localPath);
        return;
      }

      if (attachment.fileUrl) {
        const link = document.createElement('a');
        link.href = attachment.fileUrl;
        link.download = fileName;
        link.target = '_blank';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        return;
      }

      toast.error('مسار الملف غير متوفر');
    } catch (error) {
      console.error('Download attachment error:', error);
      toast.error('فشل في تنزيل الملف');
    }
  };

  const AttachmentList = ({
    type,
    title,
    icon: Icon,
  }: {
    type: string;
    title: string;
    icon: any;
  }) => {
    const attachments = getAttachmentsByType(type);

    return (
      <div className="space-y-3 md:space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 md:gap-3">
          <div className="flex items-center gap-2">
            <Icon className="h-4 w-4 md:h-5 md:w-5 text-primary" />
            <h3 className="text-sm md:text-base font-semibold">{title}</h3>
            <Badge
              variant="secondary"
              className="text-xs h-5 w-5 rounded-full p-0 flex items-center justify-center"
            >
              {attachments.length}
            </Badge>
          </div>

          <Button
            size="sm"
            variant="outline"
            className="w-full sm:w-auto text-xs md:text-sm"
            onClick={() => {
              setUploadTab(type as any);
              document.getElementById('file-upload')?.click();
            }}
          >
            <Upload className="h-3 w-3 md:h-4 md:w-4 mr-1 md:mr-2" />
            رفع ملف
          </Button>
        </div>

        {attachments.length === 0 ? (
          <div className="text-center py-6 md:py-8 border-2 border-dashed rounded-lg">
            <Icon className="h-10 w-10 md:h-12 md:w-12 mx-auto mb-2 opacity-30" />
            <p className="text-xs md:text-sm text-muted-foreground">لا توجد مرفقات</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 md:gap-3">
            {attachments.map((att: any, index: number) => (
              <div
                key={att.id || att.fileUrl || `${att.fileName}-${index}`}
                className="border rounded-lg p-2 md:p-3 hover:border-primary transition-colors"
              >
                {att.fileType?.startsWith('image/') ? (
                  <div
                    className="aspect-square bg-muted rounded-md mb-2 overflow-hidden cursor-pointer"
                    onClick={() => openAttachment(att)}
                  >
                    <img
                      src={att.fileUrl}
                      alt={att.originalName || att.fileName}
                      className="w-full h-full object-cover"
                    />
                  </div>
                ) : (
                  <div
                    className="aspect-square bg-muted rounded-md mb-2 flex items-center justify-center cursor-pointer"
                    onClick={() => openAttachment(att)}
                  >
                    <FileText className="h-10 w-10 md:h-12 md:w-12 text-muted-foreground" />
                  </div>
                )}

                <p className="text-xs font-medium truncate mb-1">
                  {att.originalName || att.fileName}
                </p>

                <p className="text-xs text-muted-foreground mb-2">
                  {formatFileSize(att.fileSize)}
                </p>

                <div className="grid grid-cols-3 gap-1">
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 text-xs"
                    onClick={() => openAttachment(att)}
                    title="معاينة / فتح"
                  >
                    <Eye className="h-3 w-3" />
                  </Button>

                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 text-xs"
                    onClick={() => downloadAttachment(att)}
                    title="تنزيل الملف"
                  >
                    <Download className="h-3 w-3" />
                  </Button>

                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 text-xs text-destructive hover:text-destructive"
                    onClick={() => {
                      deleteAttachment(deedId, att.id);
                      toast.success('تم حذف المرفق');
                    }}
                    title="حذف المرفق"
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  if (!deed || !deedId) {
    return (
      <div className="flex flex-col items-center justify-center h-96">
        <FileText className="h-24 w-24 text-muted-foreground mb-4" />
        <h2 className="text-2xl font-bold mb-2">الصك غير موجود</h2>
        <p className="text-muted-foreground mb-4">لم يتم العثور على الصك المطلوب</p>
        <Button onClick={() => navigate('/deeds')}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          العودة للقائمة
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4 md:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 md:gap-4">
        <div className="flex items-center gap-2 md:gap-3 min-w-0">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/deeds')}
            className="shrink-0 h-8 w-8 md:h-10 md:w-10"
          >
            <ArrowLeft className="h-4 w-4 md:h-5 md:w-5" />
          </Button>

          <div className="min-w-0">
            <h1 className="text-xl md:text-2xl lg:text-3xl font-bold truncate">
              {isEditing ? 'تعديل الصك' : t('deed.viewDeed')}
            </h1>
            <p className="text-sm md:text-base text-muted-foreground mt-1 truncate">
              رقم الصك: {deed.deedNumber}
            </p>
          </div>
        </div>

        <div className="flex flex-col-reverse sm:flex-row gap-2 w-full sm:w-auto">
          {isEditing ? (
            <>
              <Button
                variant="outline"
                onClick={cancelEdit}
                disabled={isSavingEdit}
                className="text-sm md:text-base"
              >
                <X className="h-3 w-3 md:h-4 md:w-4 mr-2" />
                إلغاء
              </Button>

              <Button
                onClick={saveEdit}
                disabled={isSavingEdit}
                className="text-sm md:text-base"
              >
                <Save className="h-3 w-3 md:h-4 md:w-4 mr-2" />
                {isSavingEdit ? 'جاري الحفظ...' : 'حفظ التعديلات'}
              </Button>
            </>
          ) : (
            <>
              <Button
                variant="outline"
                onClick={startEdit}
                className="text-sm md:text-base"
              >
                <Edit className="h-3 w-3 md:h-4 md:w-4 mr-2" />
                {t('app.edit') || 'تعديل'}
              </Button>

              <Button
                variant="destructive"
                onClick={() => setDeleteDialogOpen(true)}
                className="text-sm md:text-base"
              >
                <Trash2 className="h-3 w-3 md:h-4 md:w-4 mr-2" />
                {t('app.delete') || 'حذف'}
              </Button>
            </>
          )}
        </div>
      </div>

      <Card>
        <CardHeader className="pb-3 md:pb-4">
          <CardTitle className="flex items-center gap-2 text-base md:text-lg">
            <FileText className="h-4 w-4 md:h-5 md:w-5" />
            المعلومات الأساسية
          </CardTitle>
        </CardHeader>

        <CardContent>
          {isEditing ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
              <div className="space-y-2">
                <Label>رقم الصك *</Label>
                <Input
                  value={editForm.deedNumber}
                  onChange={(e) => updateEditField('deedNumber', e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label>تاريخ الصك *</Label>
                <Input
                  type="date"
                  value={editForm.deedDate}
                  onChange={(e) => updateEditField('deedDate', e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label>المساحة م² *</Label>
                <Input
                  type="number"
                  value={editForm.area}
                  onChange={(e) => updateEditField('area', e.target.value)}
                />
              </div>

              <div className="space-y-2 md:col-span-2 lg:col-span-3">
                <Label>بيان العقار *</Label>
                <Textarea
                  value={editForm.propertyDescription}
                  onChange={(e) => updateEditField('propertyDescription', e.target.value)}
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label>رقم القطعة</Label>
                <Input
                  value={editForm.plotNumber}
                  onChange={(e) => updateEditField('plotNumber', e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label>رقم المخطط</Label>
                <Input
                  value={editForm.planNumber}
                  onChange={(e) => updateEditField('planNumber', e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label>الأرض مخططة؟</Label>
                <NativeSelect
                  value={editForm.isPlanned ? 'yes' : 'no'}
                  onChange={(e) => updateEditField('isPlanned', e.target.value === 'yes')}
                >
                  <option value="yes">نعم</option>
                  <option value="no">لا</option>
                </NativeSelect>
              </div>

              <div className="space-y-2">
                <Label>نوع الاستخدام</Label>
                <NativeSelect
                  value={editForm.usageType}
                  onChange={(e) => updateEditField('usageType', e.target.value)}
                >
                  <option value="">اختر نوع الاستخدام</option>
                  {usageTypes.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </NativeSelect>
              </div>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">{t('deed.deedNumber')}</p>
                  <p className="text-lg font-semibold">{deed.deedNumber}</p>
                </div>

                <div>
                  <p className="text-sm text-muted-foreground mb-1">{t('deed.deedDate')}</p>
                  <p className="text-lg font-semibold">
                    {new Date(deed.deedDate).toLocaleDateString('ar-SA')}
                  </p>
                </div>

                <div>
                  <p className="text-sm text-muted-foreground mb-1">{t('deed.area')}</p>
                  <p className="text-lg font-semibold">
                    {Number(deed.area || 0).toLocaleString()} {t('deed.sqm')}
                  </p>
                </div>

                <div className="md:col-span-2 lg:col-span-3">
                  <p className="text-sm text-muted-foreground mb-1">{t('deed.propertyDescription')}</p>
                  <p className="text-base">{deed.propertyDescription}</p>
                </div>
              </div>

              <Separator className="my-6" />

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">{t('deed.plotNumber')}</p>
                  <p className="font-medium">{deed.plotNumber || '-'}</p>
                </div>

                <div>
                  <p className="text-sm text-muted-foreground mb-1">{t('deed.planNumber')}</p>
                  <p className="font-medium">{deed.planNumber || '-'}</p>
                </div>

                <div>
                  <p className="text-sm text-muted-foreground mb-1">{t('deed.isPlanned')}</p>
                  {deed.isPlanned ? (
                    <Badge variant="secondary">نعم</Badge>
                  ) : (
                    <Badge variant="outline">لا</Badge>
                  )}
                </div>

                <div>
                  <p className="text-sm text-muted-foreground mb-1">{t('deed.usageType')}</p>
                  <p className="font-medium">{deed.usageType}</p>
                </div>
              </div>
            </>
          )}
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
          {isEditing ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
              <div className="space-y-2">
                <Label>المنطقة</Label>
                <Input
                  value={editForm.region}
                  onChange={(e) => updateEditField('region', e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label>المدينة *</Label>
                <NativeSelect
                  value={editForm.city}
                  onChange={(e) => updateEditField('city', e.target.value)}
                >
                  <option value="">اختر المدينة</option>
                  {cities.map((city) => (
                    <option key={city} value={city}>
                      {city}
                    </option>
                  ))}
                </NativeSelect>
              </div>

              <div className="space-y-2">
                <Label>الحي *</Label>
                <Input
                  value={editForm.district}
                  onChange={(e) => updateEditField('district', e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label>الموقع</Label>
                <Input
                  value={editForm.location}
                  onChange={(e) => updateEditField('location', e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label>خط العرض</Label>
                <Input
                  value={editForm.latitude}
                  onChange={(e) => updateEditField('latitude', e.target.value)}
                  placeholder="26.392700"
                />
              </div>

              <div className="space-y-2">
                <Label>خط الطول</Label>
                <Input
                  value={editForm.longitude}
                  onChange={(e) => updateEditField('longitude', e.target.value)}
                  placeholder="50.043800"
                />
              </div>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">{t('deed.region')}</p>
                  <p className="font-medium">{deed.region}</p>
                </div>

                <div>
                  <p className="text-sm text-muted-foreground mb-1">{t('deed.city')}</p>
                  <p className="font-medium">{deed.city}</p>
                </div>

                <div>
                  <p className="text-sm text-muted-foreground mb-1">{t('deed.district')}</p>
                  <p className="font-medium">{deed.district}</p>
                </div>

                <div>
                  <p className="text-sm text-muted-foreground mb-1">{t('deed.location')}</p>
                  <p className="font-medium">{deed.location || '-'}</p>
                </div>
              </div>

              {deed.coordinates && (
                <>
                  <Separator className="my-6" />

                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <p className="text-xs md:text-sm text-muted-foreground mb-2">
                        {t('deed.coordinates')}
                      </p>

                      <div className="flex flex-col sm:flex-row gap-2 sm:gap-6">
                        <div>
                          <span className="text-xs text-muted-foreground">{t('deed.latitude')}: </span>
                          <span className="text-xs md:text-sm font-mono font-medium">
                            {deed.coordinates.latitude.toFixed(6)}
                          </span>
                        </div>

                        <div>
                          <span className="text-xs text-muted-foreground">{t('deed.longitude')}: </span>
                          <span className="text-xs md:text-sm font-mono font-medium">
                            {deed.coordinates.longitude.toFixed(6)}
                          </span>
                        </div>
                      </div>
                    </div>

                    <Button
                      variant="outline"
                      onClick={() => navigate(`/maps/${deedId}`)}
                      className="w-full sm:w-auto text-xs md:text-sm"
                    >
                      <MapIcon className="h-3 w-3 md:h-4 md:w-4 mr-2" />
                      {t('maps.viewOnMap')}
                    </Button>
                  </div>
                </>
              )}
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3 md:pb-4">
          <CardTitle className="text-base md:text-lg">الملاحظات</CardTitle>
        </CardHeader>

        <CardContent>
          {isEditing ? (
            <Textarea
              value={editForm.notes}
              onChange={(e) => updateEditField('notes', e.target.value)}
              rows={4}
              placeholder="أي ملاحظات إضافية..."
            />
          ) : deed.notes ? (
            <p className="text-xs md:text-sm whitespace-pre-wrap">{deed.notes}</p>
          ) : (
            <p className="text-xs md:text-sm text-muted-foreground">لا توجد ملاحظات</p>
          )}
        </CardContent>
      </Card>

      {isEditing && (
        <div className="flex flex-col-reverse sm:flex-row gap-2 md:gap-3 sm:justify-end">
          <Button
            type="button"
            variant="outline"
            onClick={cancelEdit}
            disabled={isSavingEdit}
            className="w-full sm:w-auto"
          >
            <X className="h-4 w-4 mr-2" />
            إلغاء
          </Button>

          <Button
            type="button"
            onClick={saveEdit}
            disabled={isSavingEdit}
            className="bg-primary w-full sm:w-auto"
          >
            <Save className="h-4 w-4 mr-2" />
            {isSavingEdit ? 'جاري الحفظ...' : 'حفظ التعديلات'}
          </Button>
        </div>
      )}

      <Card>
        <CardHeader className="pb-3 md:pb-4">
          <CardTitle className="text-base md:text-lg">{t('attachments.title')}</CardTitle>
        </CardHeader>

        <CardContent>
          <Tabs defaultValue="deed" className="w-full">
            <TabsList className="grid w-full grid-cols-2 md:grid-cols-4 h-auto">
              <TabsTrigger value="deed" className="text-xs md:text-sm py-2 md:py-2.5">
                <FileText className="h-3 w-3 md:h-4 md:w-4 mr-1 md:mr-2" />
                <span className="hidden sm:inline">{t('attachments.deed')}</span>
                <span className="sm:hidden">الصك</span>
              </TabsTrigger>

              <TabsTrigger value="site" className="text-xs md:text-sm py-2 md:py-2.5">
                <MapPin className="h-3 w-3 md:h-4 md:w-4 mr-1 md:mr-2" />
                <span className="hidden sm:inline">{t('attachments.site')}</span>
                <span className="sm:hidden">الموقع</span>
              </TabsTrigger>

              <TabsTrigger value="plan" className="text-xs md:text-sm py-2 md:py-2.5">
                <MapIcon className="h-3 w-3 md:h-4 md:w-4 mr-1 md:mr-2" />
                <span className="hidden sm:inline">{t('attachments.plan')}</span>
                <span className="sm:hidden">المخطط</span>
              </TabsTrigger>

              <TabsTrigger value="additional" className="text-xs md:text-sm py-2 md:py-2.5">
                <ImageIcon className="h-3 w-3 md:h-4 md:w-4 mr-1 md:mr-2" />
                <span className="hidden sm:inline">{t('attachments.additional')}</span>
                <span className="sm:hidden">أخرى</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="deed" className="mt-4 md:mt-6">
              <AttachmentList type="deed" title={t('attachments.deed')} icon={FileText} />
            </TabsContent>

            <TabsContent value="site" className="mt-4 md:mt-6">
              <AttachmentList type="site" title={t('attachments.site')} icon={ImageIcon} />
            </TabsContent>

            <TabsContent value="plan" className="mt-4 md:mt-6">
              <AttachmentList type="plan" title={t('attachments.plan')} icon={MapIcon} />
            </TabsContent>

            <TabsContent value="additional" className="mt-4 md:mt-6">
              <AttachmentList type="additional" title={t('attachments.additional')} icon={PlusCircle} />
            </TabsContent>
          </Tabs>

          <input
            id="file-upload"
            type="file"
            multiple
            accept="image/*,.pdf,.doc,.docx"
            className="hidden"
            onChange={handleFileUpload}
          />
        </CardContent>
      </Card>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('deed.deleteDeed')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('deed.confirmDelete')}
              <br />
              <span className="text-destructive">{t('deed.deleteWarning')}</span>
            </AlertDialogDescription>
          </AlertDialogHeader>

          <AlertDialogFooter>
            <AlertDialogCancel>{t('app.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {t('app.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={!!previewImage} onOpenChange={() => setPreviewImage(null)}>
        <DialogContent className="max-w-[95vw] md:max-w-4xl max-h-[90vh] overflow-auto">
          <DialogHeader>
            <DialogTitle className="text-base md:text-lg">معاينة المرفق</DialogTitle>
          </DialogHeader>

          {previewImage && (
            <div className="mt-3 md:mt-4">
              <img src={previewImage} alt="Preview" className="w-full h-auto rounded-lg" />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};