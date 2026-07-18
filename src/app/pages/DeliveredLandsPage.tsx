import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useData } from '../../context/DataContext';
import { usePermissions } from '../../context/PermissionsContext';
import {
  Plus,
  Eye,
  Edit,
  Trash2,
  MapPin,
  Search,
  Filter,
  Save,
  X,
  ClipboardList,
  Building2,
  CalendarDays,
  Ruler,
  CheckCircle2,
  AlertTriangle,
  FileText,
  BarChart3,
  Paperclip,
  Map as MapIcon,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Badge } from '../components/ui/badge';
import { NativeSelect } from '../components/ui/native-select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { FileUploadZone } from '../components/FileUploadZone';
import { MapCoordinatePicker } from '../components/MapCoordinatePicker';
import { Separator } from '../components/ui/separator';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '../components/ui/dialog';
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
import { toast } from 'sonner';
import type { DeliveredLand } from '../../types/models';

type DeliveredLandFormState = {
  receiptNumber: string;
  receiptDate: string;
  deliveringEntity: string;
  recipientEntity: string;
  landName: string;
  description: string;
  region: string;
  city: string;
  district: string;
  plotNumber: string;
  planNumber: string;
  area: number | string;
  usageType: string;
  status: string;
  hasRelatedDeed: boolean;
  relatedDeedNumber: string;
  latitude: string;
  longitude: string;
  location: string;
  notes: string;
  attachments: AttachmentItem[];
};

type AttachmentItem = {
  id: string;
  title: string;
  driveUrl: string;
  attachmentType: 'delivery_minutes' | 'deed_image' | 'plan_image' | 'location_image' | 'other';
  createdAt: string;
};

const emptyForm: DeliveredLandFormState = {
  receiptNumber: '',
  receiptDate: new Date().toISOString().split('T')[0],
  deliveringEntity: '',
  recipientEntity: 'جامعة الإمام عبدالرحمن بن فيصل',
  landName: '',
  description: '',
  region: 'المنطقة الشرقية',
  city: '',
  district: '',
  plotNumber: '',
  planNumber: '',
  area: '',
  usageType: '',
  status: 'مستلمة رسميًا',
  hasRelatedDeed: false,
  relatedDeedNumber: '',
  latitude: '',
  longitude: '',
  location: '',
  notes: '',
  attachments: [],
};

const statusOptions = [
  'مستلمة رسميًا',
  'تحت المراجعة',
  'تحتاج استكمال مستندات',
  'تم الرفع لصاحب الصلاحية',
  'مؤرشفة',
];

const usageTypeOptions = [
  'تعليمي',
  'إداري',
  'استثماري',
  'خدمي',
  'سكني',
  'تجاري',
  'مرافق عامة',
  'أخرى',
];

const cityOptions = [
  'الدمام',
  'الخبر',
  'الظهران',
  'القطيف',
  'الجبيل',
  'الأحساء',
  'حفر الباطن',
  'رأس تنورة',
  'بقيق',
];

const getStatusBadgeVariant = (status?: string) => {
  if (status === 'مستلمة رسميًا') return 'secondary';
  if (status === 'تحتاج استكمال مستندات') return 'destructive';
  if (status === 'تحت المراجعة') return 'outline';
  return 'secondary';
};

const normalizeDate = (value: any) => {
  if (!value) return '-';

  try {
    return new Date(value).toLocaleDateString('ar-SA');
  } catch {
    return '-';
  }
};

const getLandAttachments = (land: any): AttachmentItem[] => {
  return Array.isArray(land?.attachments) ? land.attachments : [];
};

const filterAttachments = (attachments: AttachmentItem[] = [], type: AttachmentItem['attachmentType']) => {
  return attachments.filter((attachment) => attachment.attachmentType === type);
};

const makeAttachments = (
  links: { title: string; url: string }[],
  attachmentType: AttachmentItem['attachmentType']
): AttachmentItem[] => {
  return links.map((link) => ({
    id: `${attachmentType}-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    title: link.title,
    driveUrl: link.url,
    attachmentType,
    createdAt: new Date().toISOString(),
  }));
};

const getLandCoordinates = (land: any) => {
  if (!land?.coordinates) return null;

  if (typeof land.coordinates === 'string') {
    return land.coordinates;
  }

  if (
    typeof land.coordinates.latitude === 'number' &&
    typeof land.coordinates.longitude === 'number'
  ) {
    return `${land.coordinates.latitude},${land.coordinates.longitude}`;
  }

  return null;
};

export const DeliveredLandsPage: React.FC = () => {
  const { t } = useTranslation();
  const {
    deliveredLands,
    addDeliveredLand,
    updateDeliveredLand,
    deleteDeliveredLand,
  } = useData();

  const { hasPermission } = usePermissions();

  const [searchQuery, setSearchQuery] = useState('');
  const [filterCity, setFilterCity] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  const [formOpen, setFormOpen] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const [selectedLand, setSelectedLand] = useState<DeliveredLand | null>(null);
  const [landToDelete, setLandToDelete] = useState<DeliveredLand | null>(null);

  const [formMode, setFormMode] = useState<'add' | 'edit'>('add');
  const [form, setForm] = useState<DeliveredLandFormState>(emptyForm);
  const [isSaving, setIsSaving] = useState(false);
  const [showMap, setShowMap] = useState(false);

  const [deliveryMinutesLinks, setDeliveryMinutesLinks] = useState<{ title: string; url: string }[]>([]);
  const [deedLinks, setDeedLinks] = useState<{ title: string; url: string }[]>([]);
  const [planLinks, setPlanLinks] = useState<{ title: string; url: string }[]>([]);
  const [siteLinks, setSiteLinks] = useState<{ title: string; url: string }[]>([]);
  const [otherLinks, setOtherLinks] = useState<{ title: string; url: string }[]>([]);

  const deliveredLandsSafe = Array.isArray(deliveredLands) ? deliveredLands : [];

  const filteredLands = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    return deliveredLandsSafe.filter((land: any) => {
      const matchesSearch =
        !query ||
        [
          land.receiptNumber,
          land.landName,
          land.description,
          land.deliveringEntity,
          land.recipientEntity,
          land.city,
          land.district,
          land.plotNumber,
          land.planNumber,
          land.relatedDeedNumber,
          land.location,
          land.status,
        ]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(query));

      const matchesCity = !filterCity || land.city === filterCity;
      const matchesStatus = !filterStatus || land.status === filterStatus;

      return matchesSearch && matchesCity && matchesStatus;
    });
  }, [deliveredLandsSafe, searchQuery, filterCity, filterStatus]);

  const totalArea = useMemo(() => {
    return deliveredLandsSafe.reduce((sum: number, land: any) => {
      return sum + Number(land.area || 0);
    }, 0);
  }, [deliveredLandsSafe]);

  const completedCount = useMemo(() => {
    return deliveredLandsSafe.filter((land: any) => land.status === 'مستلمة رسميًا').length;
  }, [deliveredLandsSafe]);

  const needsCompletionCount = useMemo(() => {
    return deliveredLandsSafe.filter((land: any) => land.status === 'تحتاج استكمال مستندات').length;
  }, [deliveredLandsSafe]);

  const availableCities = useMemo(() => {
    return Array.from(
      new Set(deliveredLandsSafe.map((land: any) => land.city).filter(Boolean))
    ).sort();
  }, [deliveredLandsSafe]);

  const resetAttachmentLinks = () => {
    setDeliveryMinutesLinks([]);
    setDeedLinks([]);
    setPlanLinks([]);
    setSiteLinks([]);
    setOtherLinks([]);
  };

  const updateFormField = (field: keyof DeliveredLandFormState, value: any) => {
    setForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const openAddForm = () => {
    if (!hasPermission('delivered_lands', 'canAdd')) {
      toast.error(t('permissions.cannotAddLands') || 'لا تملك صلاحية الإضافة');
      return;
    }

    setFormMode('add');
    setSelectedLand(null);
    setDetailsOpen(false);
    setForm(emptyForm);
    setShowMap(false);
    resetAttachmentLinks();
    setFormOpen(true);
    setTimeout(() => {
      document.getElementById('delivered-land-form')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 50);
  };

  const openEditForm = (land: any) => {
    setFormMode('edit');
    setSelectedLand(land);

    const coordinates = land.coordinates || {};

    setForm({
      receiptNumber: land.receiptNumber || '',
      receiptDate: land.receiptDate || land.deliveryDate || new Date().toISOString().split('T')[0],
      deliveringEntity: land.deliveringEntity || '',
      recipientEntity: land.recipientEntity || '',
      landName: land.landName || '',
      description: land.description || land.propertyDescription || '',
      region: land.region || 'المنطقة الشرقية',
      city: land.city || '',
      district: land.district || '',
      plotNumber: land.plotNumber || '',
      planNumber: land.planNumber || '',
      area: land.area || '',
      usageType: land.usageType || '',
      status: land.status || 'مستلمة رسميًا',
      hasRelatedDeed: Boolean(land.hasRelatedDeed),
      relatedDeedNumber: land.relatedDeedNumber || '',
      latitude:
        typeof coordinates.latitude === 'number'
          ? String(coordinates.latitude)
          : '',
      longitude:
        typeof coordinates.longitude === 'number'
          ? String(coordinates.longitude)
          : '',
      location: land.location || '',
      notes: land.notes || '',
      attachments: getLandAttachments(land),
    });

    setDetailsOpen(false);
    setShowMap(false);
    resetAttachmentLinks();
    setFormOpen(true);
    setTimeout(() => {
      document.getElementById('delivered-land-form')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 50);
  };

  const openDetails = (land: DeliveredLand) => {
    setSelectedLand(land);
    setFormOpen(false);
    setDetailsOpen(true);
    setTimeout(() => {
      document.getElementById('delivered-land-details')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 50);
  };

  const requestDelete = (land: DeliveredLand) => {
    if (!hasPermission('delivered_lands', 'canDelete')) {
      toast.error(t('permissions.cannotDeleteLands') || 'لا تملك صلاحية الحذف');
      return;
    }

    setLandToDelete(land);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!landToDelete) return;

    try {
      await deleteDeliveredLand(landToDelete.id);
      toast.success(t('success.landDeleted') || 'تم حذف الأرض المستلمة بنجاح');
      setDeleteDialogOpen(false);
      setLandToDelete(null);
    } catch (error) {
      console.error('Error deleting delivered land:', error);
      toast.error('فشل في حذف السجل');
    }
  };

  const validateForm = () => {
    if (!form.receiptNumber.trim()) {
      toast.error('رقم محضر الاستلام مطلوب');
      return false;
    }

    if (!form.receiptDate) {
      toast.error('تاريخ الاستلام مطلوب');
      return false;
    }

    if (!form.deliveringEntity.trim()) {
      toast.error('الجهة المسلّمة مطلوبة');
      return false;
    }

    if (!form.recipientEntity.trim()) {
      toast.error('الجهة المستلمة مطلوبة');
      return false;
    }

    if (!form.city.trim()) {
      toast.error('المدينة مطلوبة');
      return false;
    }

    if (!form.district.trim()) {
      toast.error('الحي مطلوب');
      return false;
    }

    if (!form.area || Number(form.area) <= 0) {
      toast.error('المساحة يجب أن تكون أكبر من صفر');
      return false;
    }

    return true;
  };

  const buildPayload = () => {
    const latitude = form.latitude ? Number(form.latitude) : null;
    const longitude = form.longitude ? Number(form.longitude) : null;

    const coordinates =
      latitude !== null &&
      longitude !== null &&
      !Number.isNaN(latitude) &&
      !Number.isNaN(longitude)
        ? { latitude, longitude }
        : undefined;

    const existingAttachments = form.attachments || [];
    const attachments = [
      ...existingAttachments,
      ...makeAttachments(deliveryMinutesLinks, 'delivery_minutes'),
      ...makeAttachments(deedLinks, 'deed_image'),
      ...makeAttachments(planLinks, 'plan_image'),
      ...makeAttachments(siteLinks, 'location_image'),
      ...makeAttachments(otherLinks, 'other'),
    ];

    return {
      receiptNumber: form.receiptNumber.trim(),
      receiptDate: form.receiptDate,
      deliveryDate: form.receiptDate,
      deliveringEntity: form.deliveringEntity.trim(),
      recipientEntity: form.recipientEntity.trim(),
      landName: form.landName.trim(),
      description: form.description.trim(),
      propertyDescription: form.description.trim(),
      region: form.region.trim(),
      city: form.city.trim(),
      district: form.district.trim(),
      plotNumber: form.plotNumber.trim(),
      planNumber: form.planNumber.trim(),
      area: Number(form.area || 0),
      usageType: form.usageType,
      status: form.status,
      hasRelatedDeed: form.hasRelatedDeed,
      relatedDeedNumber: form.hasRelatedDeed ? form.relatedDeedNumber.trim() : '',
      location: form.location.trim(),
      notes: form.notes.trim(),
      attachments,
      ...(coordinates ? { coordinates } : {}),
    };
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    setIsSaving(true);

    try {
      const payload = buildPayload();

      if (formMode === 'add') {
        await addDeliveredLand(payload as any);
        toast.success('تمت إضافة الأرض المستلمة بنجاح');
      } else if (selectedLand) {
        await updateDeliveredLand(selectedLand.id, payload as any);
        toast.success('تم تحديث بيانات الأرض المستلمة بنجاح');
      }

      setFormOpen(false);
      setSelectedLand(null);
      setForm(emptyForm);
      setShowMap(false);
      resetAttachmentLinks();
    } catch (error) {
      console.error('Error saving delivered land:', error);
      toast.error('فشل في حفظ بيانات الأرض المستلمة');
    } finally {
      setIsSaving(false);
    }
  };

  const removeExistingAttachment = (url: string) => {
    setForm((prev: any) => ({
      ...prev,
      attachments: (prev.attachments || []).filter((attachment: AttachmentItem) => attachment.driveUrl !== url),
    }));
  };

  const selectedCoordinates =
    form.latitude && form.longitude
      ? {
          latitude: Number(form.latitude),
          longitude: Number(form.longitude),
        }
      : undefined;

  const setCoordinatesFromMap = (coordinates: { latitude: number; longitude: number }) => {
    updateFormField('latitude', coordinates.latitude.toFixed(6));
    updateFormField('longitude', coordinates.longitude.toFixed(6));
  };

  const openMap = (land: any) => {
    const coordinates = getLandCoordinates(land);

    if (!coordinates) {
      toast.error('لا توجد إحداثيات لهذا السجل');
      return;
    }

    window.open(`https://www.google.com/maps/search/?api=1&query=${coordinates}`, '_blank');
  };

  return (
    <div className="container mx-auto p-4 md:p-6 space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">الأراضي المستلمة</h1>
          <p className="text-muted-foreground mt-1">
            إدارة الأراضي التي تم استلامها رسميًا لصالح الجامعة مع بيانات المحاضر والمواقع والمساحات.
          </p>
        </div>

        {hasPermission('delivered_lands', 'canAdd') && (
          <Button onClick={openAddForm} className="w-full lg:w-auto">
            <Plus className="ml-2 h-4 w-4" />
            إضافة أرض مستلمة
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">إجمالي السجلات</p>
              <p className="text-2xl font-bold">{deliveredLandsSafe.length}</p>
            </div>
            <ClipboardList className="h-9 w-9 text-primary" />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">إجمالي المساحات</p>
              <p className="text-2xl font-bold">
                {totalArea.toLocaleString()} م²
              </p>
            </div>
            <Ruler className="h-9 w-9 text-primary" />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">مستلمة رسميًا</p>
              <p className="text-2xl font-bold">{completedCount}</p>
            </div>
            <CheckCircle2 className="h-9 w-9 text-primary" />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">تحتاج استكمال</p>
              <p className="text-2xl font-bold">{needsCompletionCount}</p>
            </div>
            <AlertTriangle className="h-9 w-9 text-destructive" />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            البحث والتصفية
          </CardTitle>
          <CardDescription>
            ابحث برقم المحضر أو الجهة أو المدينة أو الحي أو رقم الصك المرتبط.
          </CardDescription>
        </CardHeader>

        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div className="relative md:col-span-2">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="بحث في الأراضي المستلمة..."
                className="pr-9"
              />
            </div>

            <NativeSelect
              value={filterCity}
              onChange={(e) => setFilterCity(e.target.value)}
            >
              <option value="">جميع المدن</option>
              {availableCities.map((city) => (
                <option key={city} value={city}>
                  {city}
                </option>
              ))}
            </NativeSelect>

            <NativeSelect
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
            >
              <option value="">جميع الحالات</option>
              {statusOptions.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </NativeSelect>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            قائمة الأراضي المستلمة ({filteredLands.length})
          </CardTitle>
        </CardHeader>

        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>رقم المحضر</TableHead>
                  <TableHead>تاريخ الاستلام</TableHead>
                  <TableHead>الجهة المسلّمة</TableHead>
                  <TableHead>المدينة / الحي</TableHead>
                  <TableHead>القطعة / المخطط</TableHead>
                  <TableHead>المساحة</TableHead>
                  <TableHead>الحالة</TableHead>
                  <TableHead className="text-center">الإجراءات</TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {filteredLands.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center text-muted-foreground py-12">
                      <FileText className="h-12 w-12 mx-auto mb-3 opacity-30" />
                      لا توجد أراضٍ مستلمة مطابقة للبحث.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredLands.map((land: any) => (
                    <TableRow key={land.id}>
                      <TableCell className="font-medium">
                        {land.receiptNumber || '-'}
                      </TableCell>

                      <TableCell>
                        <div className="flex items-center gap-2">
                          <CalendarDays className="h-4 w-4 text-muted-foreground" />
                          {normalizeDate(land.receiptDate || land.deliveryDate)}
                        </div>
                      </TableCell>

                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Building2 className="h-4 w-4 text-muted-foreground" />
                          <span className="max-w-[180px] truncate">
                            {land.deliveringEntity || '-'}
                          </span>
                        </div>
                      </TableCell>

                      <TableCell>
                        <div>
                          <p className="font-medium">{land.city || '-'}</p>
                          <p className="text-xs text-muted-foreground">{land.district || '-'}</p>
                        </div>
                      </TableCell>

                      <TableCell>
                        <div>
                          <p>قطعة: {land.plotNumber || '-'}</p>
                          <p className="text-xs text-muted-foreground">مخطط: {land.planNumber || '-'}</p>
                        </div>
                      </TableCell>

                      <TableCell>
                        {Number(land.area || 0).toLocaleString()} م²
                      </TableCell>

                      <TableCell>
                        <Badge variant={getStatusBadgeVariant(land.status) as any}>
                          {land.status || 'غير محدد'}
                        </Badge>
                      </TableCell>

                      <TableCell>
                        <div className="flex items-center justify-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            title="عرض التفاصيل"
                            onClick={() => openDetails(land)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>

                          <Button
                            variant="ghost"
                            size="icon"
                            title="تعديل"
                            onClick={() => openEditForm(land)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>

                          {getLandCoordinates(land) && (
                            <Button
                              variant="ghost"
                              size="icon"
                              title="فتح الخريطة"
                              onClick={() => openMap(land)}
                            >
                              <MapPin className="h-4 w-4 text-primary" />
                            </Button>
                          )}

                          {hasPermission('delivered_lands', 'canDelete') && (
                            <Button
                              variant="ghost"
                              size="icon"
                              title="حذف"
                              onClick={() => requestDelete(land)}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {formOpen && (
        <div id="delivered-land-form" className="rounded-xl border bg-card p-4 md:p-6 shadow-sm">
          <div className="mb-5 flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div>
              <h2 className="text-xl md:text-2xl font-bold">
                {formMode === 'add' ? 'إضافة أرض مستلمة' : 'تعديل أرض مستلمة'}
              </h2>
              <p className="text-sm text-muted-foreground mt-1">
                أدخل بيانات الأرض المستلمة ومحضر الاستلام والموقع والمرفقات.
              </p>
            </div>

            <Button
              variant="outline"
              onClick={() => {
                setFormOpen(false);
                setSelectedLand(null);
                setForm(emptyForm);
                setShowMap(false);
                resetAttachmentLinks();
              }}
              disabled={isSaving}
              className="w-full md:w-auto"
            >
              <X className="ml-2 h-4 w-4" />
              إغلاق النموذج
            </Button>
          </div>

          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">بيانات محضر الاستلام</CardTitle>
              </CardHeader>

              <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>رقم محضر الاستلام *</Label>
                  <Input
                    value={form.receiptNumber}
                    onChange={(e) => updateFormField('receiptNumber', e.target.value)}
                    placeholder="REC-001"
                  />
                </div>

                <div className="space-y-2">
                  <Label>تاريخ الاستلام *</Label>
                  <Input
                    type="date"
                    value={form.receiptDate}
                    onChange={(e) => updateFormField('receiptDate', e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label>حالة الأرض</Label>
                  <NativeSelect
                    value={form.status}
                    onChange={(e) => updateFormField('status', e.target.value)}
                  >
                    {statusOptions.map((status) => (
                      <option key={status} value={status}>
                        {status}
                      </option>
                    ))}
                  </NativeSelect>
                </div>

                <div className="space-y-2">
                  <Label>الجهة المسلّمة *</Label>
                  <Input
                    value={form.deliveringEntity}
                    onChange={(e) => updateFormField('deliveringEntity', e.target.value)}
                    placeholder="مثال: أمانة المنطقة الشرقية"
                  />
                </div>

                <div className="space-y-2">
                  <Label>الجهة المستلمة *</Label>
                  <Input
                    value={form.recipientEntity}
                    onChange={(e) => updateFormField('recipientEntity', e.target.value)}
                    placeholder="جامعة الإمام عبدالرحمن بن فيصل"
                  />
                </div>

                <div className="space-y-2">
                  <Label>نوع الاستخدام</Label>
                  <NativeSelect
                    value={form.usageType}
                    onChange={(e) => updateFormField('usageType', e.target.value)}
                  >
                    <option value="">اختر نوع الاستخدام</option>
                    {usageTypeOptions.map((usageType) => (
                      <option key={usageType} value={usageType}>
                        {usageType}
                      </option>
                    ))}
                  </NativeSelect>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">بيانات الأرض والموقع</CardTitle>
              </CardHeader>

              <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>اسم الأرض / الموقع</Label>
                  <Input
                    value={form.landName}
                    onChange={(e) => updateFormField('landName', e.target.value)}
                    placeholder="أرض الحرم الشرقي"
                  />
                </div>

                <div className="space-y-2">
                  <Label>المنطقة</Label>
                  <Input
                    value={form.region}
                    onChange={(e) => updateFormField('region', e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label>المدينة *</Label>
                  <NativeSelect
                    value={form.city}
                    onChange={(e) => updateFormField('city', e.target.value)}
                  >
                    <option value="">اختر المدينة</option>
                    {cityOptions.map((city) => (
                      <option key={city} value={city}>
                        {city}
                      </option>
                    ))}
                  </NativeSelect>
                </div>

                <div className="space-y-2">
                  <Label>الحي *</Label>
                  <Input
                    value={form.district}
                    onChange={(e) => updateFormField('district', e.target.value)}
                    placeholder="اسم الحي"
                  />
                </div>

                <div className="space-y-2">
                  <Label>رقم القطعة</Label>
                  <Input
                    value={form.plotNumber}
                    onChange={(e) => updateFormField('plotNumber', e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label>رقم المخطط</Label>
                  <Input
                    value={form.planNumber}
                    onChange={(e) => updateFormField('planNumber', e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label>المساحة م² *</Label>
                  <Input
                    type="number"
                    value={form.area}
                    onChange={(e) => updateFormField('area', e.target.value)}
                    placeholder="50000"
                  />
                </div>

                <div className="space-y-2">
                  <Label>خط العرض</Label>
                  <Input
                    value={form.latitude}
                    onChange={(e) => updateFormField('latitude', e.target.value)}
                    placeholder="26.392700"
                  />
                </div>

                <div className="space-y-2">
                  <Label>خط الطول</Label>
                  <Input
                    value={form.longitude}
                    onChange={(e) => updateFormField('longitude', e.target.value)}
                    placeholder="50.043800"
                  />
                </div>

                <div className="space-y-2 md:col-span-3">
                  <div className="rounded-lg border bg-muted/20 p-4">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                      <div>
                        <p className="font-medium">الإحداثيات</p>
                        <p className="text-sm text-muted-foreground">
                          {form.latitude && form.longitude
                            ? `${form.latitude}, ${form.longitude}`
                            : 'لم يتم تحديد الإحداثيات بعد.'}
                        </p>
                      </div>

                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setShowMap((prev) => !prev)}
                      >
                        <MapPin className="ml-2 h-4 w-4" />
                        {showMap ? 'إخفاء الخريطة' : 'تحديد الموقع من الخريطة'}
                      </Button>
                    </div>

                    {showMap && (
                      <div className="mt-4">
                        <MapCoordinatePicker
                          coordinates={selectedCoordinates}
                          onChange={setCoordinatesFromMap}
                        />
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-2 md:col-span-3">
                  <Label>الموقع التفصيلي</Label>
                  <Input
                    value={form.location}
                    onChange={(e) => updateFormField('location', e.target.value)}
                    placeholder="وصف مختصر للموقع"
                  />
                </div>

                <div className="space-y-2 md:col-span-3">
                  <Label>وصف الأرض</Label>
                  <Textarea
                    value={form.description}
                    onChange={(e) => updateFormField('description', e.target.value)}
                    rows={3}
                    placeholder="وصف مختصر للأرض المستلمة..."
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">الصك المرتبط والملاحظات</CardTitle>
              </CardHeader>

              <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>هل يوجد صك مرتبط؟</Label>
                  <NativeSelect
                    value={form.hasRelatedDeed ? 'yes' : 'no'}
                    onChange={(e) => updateFormField('hasRelatedDeed', e.target.value === 'yes')}
                  >
                    <option value="no">لا</option>
                    <option value="yes">نعم</option>
                  </NativeSelect>
                </div>

                <div className="space-y-2 md:col-span-2">
                  <Label>رقم الصك المرتبط</Label>
                  <Input
                    disabled={!form.hasRelatedDeed}
                    value={form.relatedDeedNumber}
                    onChange={(e) => updateFormField('relatedDeedNumber', e.target.value)}
                    placeholder="مثال: 360607002075"
                  />
                </div>

                <div className="space-y-2 md:col-span-3">
                  <Label>ملاحظات</Label>
                  <Textarea
                    value={form.notes}
                    onChange={(e) => updateFormField('notes', e.target.value)}
                    rows={4}
                    placeholder="أي ملاحظات إضافية..."
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">مرفقات الاستلام</CardTitle>
                <CardDescription>
                  يتم رفع الملفات إلى Google Drive وحفظ روابطها مع سجل الأرض المستلمة.
                </CardDescription>
              </CardHeader>

              <CardContent>
                <Tabs defaultValue="minutes" className="w-full">
                  <TabsList className="grid w-full grid-cols-2 md:grid-cols-5 h-auto">
                    <TabsTrigger value="minutes">محضر الاستلام</TabsTrigger>
                    <TabsTrigger value="deed">الصك</TabsTrigger>
                    <TabsTrigger value="plan">المخطط</TabsTrigger>
                    <TabsTrigger value="site">صور الموقع</TabsTrigger>
                    <TabsTrigger value="other">أخرى</TabsTrigger>
                  </TabsList>

                  <TabsContent value="minutes" className="mt-4">
                    <FileUploadZone
                      label="محضر الاستلام"
                      existingFiles={filterAttachments((form as any).attachments || [], 'delivery_minutes').map((item) => ({
                        name: item.title,
                        url: item.driveUrl,
                      }))}
                      onDeleteExisting={removeExistingAttachment}
                      onLinksChange={setDeliveryMinutesLinks}
                      maxFiles={10}
                      maxSizeMB={10}
                      accept="image/*,.pdf"
                    />
                  </TabsContent>

                  <TabsContent value="deed" className="mt-4">
                    <FileUploadZone
                      label="صورة الصك"
                      existingFiles={filterAttachments((form as any).attachments || [], 'deed_image').map((item) => ({
                        name: item.title,
                        url: item.driveUrl,
                      }))}
                      onDeleteExisting={removeExistingAttachment}
                      onLinksChange={setDeedLinks}
                      maxFiles={10}
                      maxSizeMB={10}
                      accept="image/*,.pdf"
                    />
                  </TabsContent>

                  <TabsContent value="plan" className="mt-4">
                    <FileUploadZone
                      label="صور المخطط"
                      existingFiles={filterAttachments((form as any).attachments || [], 'plan_image').map((item) => ({
                        name: item.title,
                        url: item.driveUrl,
                      }))}
                      onDeleteExisting={removeExistingAttachment}
                      onLinksChange={setPlanLinks}
                      maxFiles={10}
                      maxSizeMB={10}
                      accept="image/*,.pdf"
                    />
                  </TabsContent>

                  <TabsContent value="site" className="mt-4">
                    <FileUploadZone
                      label="صور الموقع"
                      existingFiles={filterAttachments((form as any).attachments || [], 'location_image').map((item) => ({
                        name: item.title,
                        url: item.driveUrl,
                      }))}
                      onDeleteExisting={removeExistingAttachment}
                      onLinksChange={setSiteLinks}
                      maxFiles={10}
                      maxSizeMB={10}
                      accept="image/*"
                    />
                  </TabsContent>

                  <TabsContent value="other" className="mt-4">
                    <FileUploadZone
                      label="مرفقات إضافية"
                      existingFiles={filterAttachments((form as any).attachments || [], 'other').map((item) => ({
                        name: item.title,
                        url: item.driveUrl,
                      }))}
                      onDeleteExisting={removeExistingAttachment}
                      onLinksChange={setOtherLinks}
                      maxFiles={10}
                      maxSizeMB={10}
                      accept="image/*,.pdf,.doc,.docx"
                    />
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>

            <div className="flex flex-col-reverse md:flex-row justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setFormOpen(false)}
                disabled={isSaving}
              >
                <X className="ml-2 h-4 w-4" />
                إلغاء
              </Button>

              <Button onClick={handleSubmit} disabled={isSaving}>
                <Save className="ml-2 h-4 w-4" />
                {isSaving ? 'جاري الحفظ...' : 'حفظ البيانات'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {detailsOpen && selectedLand && (
        <div id="delivered-land-details" className="rounded-xl border bg-card p-4 md:p-6 shadow-sm">
          <div className="mb-5 flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div>
              <h2 className="text-xl md:text-2xl font-bold">تفاصيل الأرض المستلمة</h2>
              <p className="text-sm text-muted-foreground mt-1">
                عرض بيانات محضر الاستلام والموقع والمرفقات داخل نفس الصفحة.
              </p>
            </div>

            <Button
              variant="outline"
              onClick={() => {
                setDetailsOpen(false);
                setSelectedLand(null);
              }}
              className="w-full md:w-auto"
            >
              <X className="ml-2 h-4 w-4" />
              إغلاق التفاصيل
            </Button>
          </div>

          <div className="space-y-5">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div>
                  <h2 className="text-xl font-bold">
                    {(selectedLand as any).landName || (selectedLand as any).receiptNumber || 'أرض مستلمة'}
                  </h2>
                  <p className="text-muted-foreground">
                    رقم المحضر: {(selectedLand as any).receiptNumber || '-'}
                  </p>
                </div>

                <Badge variant={getStatusBadgeVariant((selectedLand as any).status) as any}>
                  {(selectedLand as any).status || 'غير محدد'}
                </Badge>
              </div>

              <Separator />

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <InfoItem label="تاريخ الاستلام" value={normalizeDate((selectedLand as any).receiptDate || (selectedLand as any).deliveryDate)} />
                <InfoItem label="الجهة المسلّمة" value={(selectedLand as any).deliveringEntity || '-'} />
                <InfoItem label="الجهة المستلمة" value={(selectedLand as any).recipientEntity || '-'} />
                <InfoItem label="المنطقة" value={(selectedLand as any).region || '-'} />
                <InfoItem label="المدينة" value={(selectedLand as any).city || '-'} />
                <InfoItem label="الحي" value={(selectedLand as any).district || '-'} />
                <InfoItem label="رقم القطعة" value={(selectedLand as any).plotNumber || '-'} />
                <InfoItem label="رقم المخطط" value={(selectedLand as any).planNumber || '-'} />
                <InfoItem label="المساحة" value={`${Number((selectedLand as any).area || 0).toLocaleString()} م²`} />
                <InfoItem label="نوع الاستخدام" value={(selectedLand as any).usageType || '-'} />
                <InfoItem label="رقم الصك المرتبط" value={(selectedLand as any).relatedDeedNumber || '-'} />
                <InfoItem label="الموقع" value={(selectedLand as any).location || '-'} />
              </div>

              {(selectedLand as any).description && (
                <InfoBlock label="وصف الأرض" value={(selectedLand as any).description} />
              )}

              {(selectedLand as any).notes && (
                <InfoBlock label="الملاحظات" value={(selectedLand as any).notes} />
              )}

              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Paperclip className="h-4 w-4" />
                    مرفقات الأرض المستلمة
                  </CardTitle>
                </CardHeader>

                <CardContent>
                  <AttachmentGroups attachments={getLandAttachments(selectedLand)} />
                </CardContent>
              </Card>

              <div className="flex flex-col md:flex-row justify-end gap-2">
                {getLandCoordinates(selectedLand) && (
                  <Button variant="outline" onClick={() => openMap(selectedLand)}>
                    <MapPin className="ml-2 h-4 w-4" />
                    فتح على الخريطة
                  </Button>
                )}

                <Button onClick={() => openEditForm(selectedLand)}>
                  <Edit className="ml-2 h-4 w-4" />
                  تعديل البيانات
                </Button>
              </div>
          </div>
        </div>
      )}

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>حذف الأرض المستلمة</AlertDialogTitle>
            <AlertDialogDescription>
              هل أنت متأكد من حذف هذا السجل؟ لا يمكن التراجع عن هذا الإجراء.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <AlertDialogFooter>
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              حذف
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

const InfoItem = ({ label, value }: { label: string; value: React.ReactNode }) => {
  return (
    <div className="rounded-lg border p-3">
      <p className="text-xs text-muted-foreground mb-1">{label}</p>
      <p className="font-medium">{value}</p>
    </div>
  );
};

const InfoBlock = ({ label, value }: { label: string; value: string }) => {
  return (
    <div className="rounded-lg border p-4">
      <p className="text-sm text-muted-foreground mb-2">{label}</p>
      <p className="whitespace-pre-wrap leading-7">{value}</p>
    </div>
  );
};

const AttachmentGroups = ({ attachments }: { attachments: AttachmentItem[] }) => {
  if (!attachments.length) {
    return <p className="text-sm text-muted-foreground">لا توجد مرفقات.</p>;
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
      {attachments.map((attachment) => (
        <a
          key={attachment.id}
          href={attachment.driveUrl}
          target="_blank"
          rel="noreferrer"
          className="rounded-lg border p-3 hover:border-primary transition-colors"
        >
          <p className="font-medium truncate">{attachment.title}</p>
          <p className="text-xs text-muted-foreground mt-1">
            {attachment.attachmentType}
          </p>
        </a>
      ))}
    </div>
  );
};
