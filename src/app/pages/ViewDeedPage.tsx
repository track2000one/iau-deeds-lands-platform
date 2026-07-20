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
  Loader2,
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
import { AppDateField } from '../components/AppDateField';
import { formatFlexibleDate } from '../../utils/dateUtils';
import type { DateType } from '../../utils/dateUtils';
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
  deedDateType: DateType;
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

const API_BASE_URL = import.meta.env.VITE_API_URL?.replace(/\/$/, '') || '';

type UiAttachmentType = 'deed' | 'site' | 'plan' | 'additional';
type ApiAttachmentType = 'deed_image' | 'location_image' | 'plan_image' | 'other';

type BackendAttachment = {
  id: string;
  entityType: string;
  entityId: string;
  attachmentType: ApiAttachmentType | string;
  title?: string | null;
  driveUrl?: string | null;
  driveFileId?: string | null;
  mimeType?: string | null;
  notes?: string | null;
  createdAt?: string;
  fileUrl?: string | null;
  fileName?: string | null;
  originalName?: string | null;
  fileType?: string | null;
  fileSize?: number | null;
};

type UploadResponse = {
  fileName: string;
  driveUrl: string;
  driveFileId: string;
  mimeType: string;
  attachment?: unknown;
};

const toApiAttachmentType = (type: UiAttachmentType): ApiAttachmentType => {
  switch (type) {
    case 'deed':
      return 'deed_image';
    case 'site':
      return 'location_image';
    case 'plan':
      return 'plan_image';
    case 'additional':
    default:
      return 'other';
  }
};

const fromApiAttachmentType = (type: string): UiAttachmentType => {
  switch (type) {
    case 'deed_image':
    case 'deed':
      return 'deed';
    case 'location_image':
    case 'site':
      return 'site';
    case 'plan_image':
    case 'plan':
      return 'plan';
    case 'other':
    case 'additional':
    default:
      return 'additional';
  }
};

const getAttachmentUrl = (attachment: any) =>
  attachment?.driveUrl || attachment?.fileUrl || '';

const getAttachmentMimeType = (attachment: any) =>
  attachment?.mimeType || attachment?.fileType || '';

const getAttachmentName = (attachment: any) =>
  attachment?.title || attachment?.originalName || attachment?.fileName || 'مرفق';

const extractGoogleDriveFileId = (attachment: any) => {
  if (attachment?.driveFileId) return attachment.driveFileId;

  const url = getAttachmentUrl(attachment);
  const match = String(url).match(/\/file\/d\/([^/]+)/);

  return match?.[1] || '';
};

const getGoogleDrivePreviewUrl = (attachment: any) => {
  const fileId = extractGoogleDriveFileId(attachment);

  if (!fileId) {
    return getAttachmentUrl(attachment);
  }

  return `https://drive.google.com/thumbnail?id=${fileId}&sz=w1000`;
};

const isImageAttachment = (attachment: any) => {
  const mimeType = getAttachmentMimeType(attachment);
  const name = getAttachmentName(attachment).toLowerCase();

  return (
    mimeType?.startsWith('image/') ||
    /\.(png|jpe?g|webp|gif|bmp|svg)$/i.test(name)
  );
};



type SafeCoordinates = {
  latitude: number;
  longitude: number;
};

const parseCoordinates = (value: unknown): SafeCoordinates | null => {
  if (!value) return null;

  try {
    let raw: any = value;

    if (typeof value === 'string') {
      const trimmed = value.trim();

      if (!trimmed) return null;

      // يدعم JSON string مثل: {"latitude":26.3,"longitude":50.2}
      if (trimmed.startsWith('{')) {
        raw = JSON.parse(trimmed);
      } else {
        // يدعم نص بسيط مثل: 26.3,50.2
        const parts = trimmed.split(',').map((part) => Number(part.trim()));

        if (parts.length >= 2 && !Number.isNaN(parts[0]) && !Number.isNaN(parts[1])) {
          return {
            latitude: parts[0],
            longitude: parts[1],
          };
        }

        return null;
      }
    }

    if (typeof raw !== 'object' || raw === null) return null;

    const latitude = Number(
      raw.latitude ??
        raw.lat ??
        raw.y ??
        raw[0]
    );

    const longitude = Number(
      raw.longitude ??
        raw.lng ??
        raw.lon ??
        raw.x ??
        raw[1]
    );

    if (Number.isNaN(latitude) || Number.isNaN(longitude)) return null;

    return {
      latitude,
      longitude,
    };
  } catch {
    return null;
  }
};

const serializeCoordinates = (value: SafeCoordinates | null) => {
  if (!value) return '';

  return JSON.stringify({
    latitude: Number(value.latitude),
    longitude: Number(value.longitude),
  });
};

const formatCoordinate = (value?: number) => {
  if (typeof value !== 'number' || Number.isNaN(value)) return '-';

  return value.toFixed(6);
};

const formatDateForInput = (value: any) => {
  if (!value) return '';

  try {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return String(value || '');
    }
    return date.toISOString().split('T')[0];
  } catch {
    return String(value || '');
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
  const [uploadTab, setUploadTab] = useState<UiAttachmentType>('deed');
  const [backendAttachments, setBackendAttachments] = useState<BackendAttachment[]>([]);
  const [attachmentsLoading, setAttachmentsLoading] = useState(false);
  const [isUploadingAttachment, setIsUploadingAttachment] = useState(false);

  const [isEditing, setIsEditing] = useState(false);
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [editForm, setEditForm] = useState<EditFormState>({
    deedNumber: '',
    deedDate: '',
    deedDateType: 'gregorian',
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
  const safeCoordinates = parseCoordinates((deed as any)?.coordinates);

  const loadBackendAttachments = React.useCallback(async () => {
    if (!deedId || !API_BASE_URL) return;

    try {
      setAttachmentsLoading(true);

      const response = await fetch(`${API_BASE_URL}/api/attachments/deed/${deedId}`);
      const body = await response.json().catch(() => []);

      if (!response.ok) {
        throw new Error(body?.message || 'تعذر تحميل المرفقات');
      }

      setBackendAttachments(Array.isArray(body) ? body : []);
    } catch (error) {
      console.error('Error loading attachments:', error);
      toast.error(error instanceof Error ? error.message : 'تعذر تحميل المرفقات');
    } finally {
      setAttachmentsLoading(false);
    }
  }, [deedId]);

  React.useEffect(() => {
    loadBackendAttachments();
  }, [loadBackendAttachments]);


  const startEdit = () => {
    if (!deed) return;

    setEditForm({
      deedNumber: deed.deedNumber || '',
      deedDate: deed.deedDateType === 'hijri' ? String(deed.deedDate || '') : formatDateForInput(deed.deedDate),
      deedDateType: (deed as any).deedDateType || 'gregorian',
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
      latitude: safeCoordinates ? String(safeCoordinates.latitude) : '',
      longitude: safeCoordinates ? String(safeCoordinates.longitude) : '',
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
          : null;

      const payload: any = {
        deedNumber: editForm.deedNumber.trim(),
        deedDate: editForm.deedDate || '',
        deedDateType: editForm.deedDateType,
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

      payload.coordinates = serializeCoordinates(coordinates);

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

  const uploadFileToGoogleDrive = async (file: File): Promise<UploadResponse> => {
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

    const body = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(body?.message || 'تعذر رفع الملف إلى Google Drive');
    }

    if (!body?.driveUrl) {
      throw new Error('تم رفع الملف لكن لم يتم إرجاع رابط Google Drive');
    }

    return body as UploadResponse;
  };

  const saveBackendAttachment = async (file: File, uploaded: UploadResponse) => {
    if (!deedId || !API_BASE_URL) {
      throw new Error('لا يمكن حفظ المرفق بدون رقم الصك أو رابط الـ Backend');
    }

    const response = await fetch(`${API_BASE_URL}/api/attachments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        entityType: 'deed',
        entityId: deedId,
        attachmentType: toApiAttachmentType(uploadTab),
        title: file.name,
        driveUrl: uploaded.driveUrl,
        driveFileId: uploaded.driveFileId || null,
        mimeType: uploaded.mimeType || file.type || null,
      }),
    });

    const body = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(body?.message || 'تم رفع الملف لكن تعذر حفظ بيانات المرفق');
    }

    return body as BackendAttachment;
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;

    if (!files || files.length === 0 || !deedId) return;

    try {
      setIsUploadingAttachment(true);

      const savedAttachments: BackendAttachment[] = [];

      for (const file of Array.from(files)) {
        const uploaded = await uploadFileToGoogleDrive(file);
        const savedAttachment = await saveBackendAttachment(file, uploaded);
        savedAttachments.push(savedAttachment);
      }

      setBackendAttachments((prev) => [...savedAttachments, ...prev]);
      toast.success(files.length === 1 ? 'تم رفع المرفق بنجاح' : `تم رفع ${files.length} مرفقات بنجاح`);
    } catch (error) {
      console.error('Attachment upload error:', error);
      toast.error(error instanceof Error ? error.message : 'فشل في رفع المرفق');
    } finally {
      setIsUploadingAttachment(false);
      event.target.value = '';
    }
  };

  const getAttachmentsByType = (type: UiAttachmentType) => {
    const remoteAttachments = backendAttachments.filter(
      (att) => fromApiAttachmentType(String(att.attachmentType)) === type
    );

    const localAttachments = Array.isArray(deed?.attachments)
      ? deed.attachments.filter((att: any) => fromApiAttachmentType(String(att.attachmentType)) === type)
      : [];

    return [...remoteAttachments, ...localAttachments];
  };

  const formatFileSize = (bytes: number) => {
    if (!bytes) return '0 Bytes';

    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  };

  const openAttachment = (attachment: any) => {
    const attachmentUrl = getAttachmentUrl(attachment);
    const mimeType = getAttachmentMimeType(attachment);

    if (!attachmentUrl && !attachment?.localPath) {
      toast.error('رابط أو مسار المرفق غير متوفر');
      return;
    }

    if (attachment.localPath && window.localAPI?.openPath) {
      window.localAPI.openPath(attachment.localPath);
      return;
    }

    if (isImageAttachment(attachment)) {
      setPreviewImage(getGoogleDrivePreviewUrl(attachment));
      return;
    }

    window.open(attachmentUrl, '_blank', 'noopener,noreferrer');
  };

  const downloadAttachment = async (attachment: any) => {
    try {
      const fileName = getAttachmentName(attachment);
      const attachmentUrl = getAttachmentUrl(attachment);

      if (attachment.localPath && window.localAPI?.openPath) {
        await window.localAPI.openPath(attachment.localPath);
        return;
      }

      if (attachmentUrl) {
        const link = document.createElement('a');
        link.href = attachmentUrl;
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
    type: UiAttachmentType;
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
            disabled={isUploadingAttachment}
            onClick={() => {
              setUploadTab(type as UiAttachmentType);
              document.getElementById('file-upload')?.click();
            }}
          >
            {isUploadingAttachment ? (
              <Loader2 className="h-3 w-3 md:h-4 md:w-4 mr-1 md:mr-2 animate-spin" />
            ) : (
              <Upload className="h-3 w-3 md:h-4 md:w-4 mr-1 md:mr-2" />
            )}
            {isUploadingAttachment ? 'جاري الرفع...' : 'رفع ملف'}
          </Button>
        </div>

        {attachmentsLoading ? (
          <div className="text-center py-6 md:py-8 border-2 border-dashed rounded-lg">
            <Loader2 className="h-8 w-8 md:h-10 md:w-10 mx-auto mb-2 animate-spin opacity-60" />
            <p className="text-xs md:text-sm text-muted-foreground">جاري تحميل المرفقات...</p>
          </div>
        ) : attachments.length === 0 ? (
          <div className="text-center py-6 md:py-8 border-2 border-dashed rounded-lg">
            <Icon className="h-10 w-10 md:h-12 md:w-12 mx-auto mb-2 opacity-30" />
            <p className="text-xs md:text-sm text-muted-foreground">لا توجد مرفقات</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 md:gap-3">
            {attachments.map((att: any, index: number) => (
              <div
                key={att.id || getAttachmentUrl(att) || `${getAttachmentName(att)}-${index}`}
                className="border rounded-lg p-2 md:p-3 hover:border-primary transition-colors"
              >
                {isImageAttachment(att) ? (
                  <div
                    className="aspect-square bg-muted rounded-md mb-2 overflow-hidden cursor-pointer"
                    onClick={() => openAttachment(att)}
                  >
                    <img
                      src={getGoogleDrivePreviewUrl(att)}
                      alt={getAttachmentName(att)}
                      className="w-full h-full object-cover"
                      onError={(event) => {
                        event.currentTarget.style.display = 'none';
                      }}
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
                  {getAttachmentName(att)}
                </p>

                <p className="text-xs text-muted-foreground mb-2">
                  {att.fileSize ? formatFileSize(att.fileSize) : getAttachmentMimeType(att) || 'Google Drive'}
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
                    onClick={async () => {
                      try {
                        if (API_BASE_URL && att.id) {
                          const response = await fetch(`${API_BASE_URL}/api/attachments/${att.id}`, {
                            method: 'DELETE',
                          });

                          if (!response.ok) {
                            const body = await response.json().catch(() => ({}));
                            throw new Error(body?.message || 'فشل في حذف المرفق');
                          }

                          setBackendAttachments((prev) => prev.filter((item) => item.id !== att.id));
                        } else {
                          await deleteAttachment(deedId, att.id);
                        }

                        toast.success('تم حذف المرفق');
                      } catch (error) {
                        console.error('Delete attachment error:', error);
                        toast.error(error instanceof Error ? error.message : 'فشل في حذف المرفق');
                      }
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

              <div className="md:col-span-2">
                <AppDateField
                  label="تاريخ الصك"
                  value={editForm.deedDate}
                  dateType={editForm.deedDateType}
                  onValueChange={(value) => updateEditField('deedDate', value)}
                  onDateTypeChange={(type) => updateEditField('deedDateType', type)}
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
                    {formatFlexibleDate(deed.deedDate, (deed as any).deedDateType || 'gregorian')}
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

              {safeCoordinates && (
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
                            {formatCoordinate(safeCoordinates.latitude)}
                          </span>
                        </div>

                        <div>
                          <span className="text-xs text-muted-foreground">{t('deed.longitude')}: </span>
                          <span className="text-xs md:text-sm font-mono font-medium">
                            {formatCoordinate(safeCoordinates.longitude)}
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
