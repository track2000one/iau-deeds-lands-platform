import React, { useMemo, useState } from 'react';
import { useData } from '../../context/DataContext';
import { usePermissions } from '../../context/PermissionsContext';
import { useAuth } from '../../context/AuthContext';
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
  FileText,
  BarChart3,
  Ruler,
  Paperclip,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Badge } from '../components/ui/badge';
import { NativeSelect } from '../components/ui/native-select';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { FileUploadZone } from '../components/FileUploadZone';
import { MapCoordinatePicker } from '../components/MapCoordinatePicker';
import { toast } from 'sonner';
import type { AllocatedLand } from '../../types/models';

type Coordinates = {
  latitude: number;
  longitude: number;
};

type AttachmentItem = {
  id: string;
  title: string;
  driveUrl: string;
  attachmentType: 'contract_image' | 'plan_image' | 'location_image' | 'other';
  createdAt: string;
};

type AllocatedLandFormState = {
  propertyDescription: string;
  plotNumber: string;
  planNumber: string;
  area: string;
  usageType: string;
  region: string;
  city: string;
  district: string;
  latitude: string;
  longitude: string;
  googleEarthLink: string;
  notes: string;
  attachments: AttachmentItem[];
};

const emptyForm: AllocatedLandFormState = {
  propertyDescription: '',
  plotNumber: '',
  planNumber: '',
  area: '',
  usageType: 'residential',
  region: 'المنطقة الشرقية',
  city: '',
  district: '',
  latitude: '',
  longitude: '',
  googleEarthLink: '',
  notes: '',
  attachments: [],
};

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

const usageTypeOptions = [
  { value: 'residential', label: 'سكني' },
  { value: 'commercial', label: 'تجاري' },
  { value: 'industrial', label: 'صناعي' },
  { value: 'agricultural', label: 'زراعي' },
  { value: 'educational', label: 'تعليمي' },
  { value: 'governmental', label: 'حكومي' },
  { value: 'mixed', label: 'مختلط' },
  { value: 'other', label: 'أخرى' },
];

const getUsageLabel = (value?: string) => {
  return usageTypeOptions.find((item) => item.value === value)?.label || value || '-';
};

const parseCoordinates = (coordinates?: string): Coordinates | undefined => {
  if (!coordinates) return undefined;

  const [lat, lng] = coordinates
    .split(',')
    .map((part) => Number(part.trim()));

  if (Number.isNaN(lat) || Number.isNaN(lng)) return undefined;

  return {
    latitude: lat,
    longitude: lng,
  };
};

const buildCoordinatesString = (latitude: string, longitude: string) => {
  if (!latitude || !longitude) return '';

  const lat = Number(latitude);
  const lng = Number(longitude);

  if (Number.isNaN(lat) || Number.isNaN(lng)) return '';

  return `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
};

const getLandAttachments = (land: any): AttachmentItem[] => {
  return Array.isArray(land?.attachments) ? land.attachments : [];
};

const filterAttachments = (attachments: AttachmentItem[], type: AttachmentItem['attachmentType']) => {
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

export const AllocatedLandsPage: React.FC = () => {
  const { currentUser } = useAuth();
  const {
    allocatedLands,
    addAllocatedLand,
    updateAllocatedLand,
    deleteAllocatedLand,
  } = useData();
  const { hasPermission } = usePermissions();

  const [searchQuery, setSearchQuery] = useState('');
  const [filterCity, setFilterCity] = useState('');
  const [filterUsageType, setFilterUsageType] = useState('');

  const [formOpen, setFormOpen] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const [selectedLand, setSelectedLand] = useState<AllocatedLand | null>(null);
  const [landToDelete, setLandToDelete] = useState<AllocatedLand | null>(null);
  const [formMode, setFormMode] = useState<'add' | 'edit'>('add');
  const [form, setForm] = useState<AllocatedLandFormState>(emptyForm);
  const [isSaving, setIsSaving] = useState(false);

  const [contractLinks, setContractLinks] = useState<{ title: string; url: string }[]>([]);
  const [planLinks, setPlanLinks] = useState<{ title: string; url: string }[]>([]);
  const [siteLinks, setSiteLinks] = useState<{ title: string; url: string }[]>([]);
  const [otherLinks, setOtherLinks] = useState<{ title: string; url: string }[]>([]);

  const allocatedLandsSafe = Array.isArray(allocatedLands) ? allocatedLands : [];

  const filteredLands = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    return allocatedLandsSafe.filter((land: any) => {
      const matchesSearch =
        !query ||
        [
          land.propertyDescription,
          land.plotNumber,
          land.planNumber,
          land.area,
          land.usageType,
          land.region,
          land.city,
          land.district,
          land.coordinates,
          land.googleEarthLink,
          land.notes,
        ]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(query));

      const matchesCity = !filterCity || land.city === filterCity;
      const matchesUsage = !filterUsageType || land.usageType === filterUsageType;

      return matchesSearch && matchesCity && matchesUsage;
    });
  }, [allocatedLandsSafe, searchQuery, filterCity, filterUsageType]);

  const totalArea = useMemo(() => {
    return allocatedLandsSafe.reduce((sum: number, land: any) => sum + Number(land.area || 0), 0);
  }, [allocatedLandsSafe]);

  const availableCities = useMemo(() => {
    return Array.from(
      new Set(allocatedLandsSafe.map((land: any) => land.city).filter(Boolean))
    ).sort();
  }, [allocatedLandsSafe]);

  const resetAttachmentLinks = () => {
    setContractLinks([]);
    setPlanLinks([]);
    setSiteLinks([]);
    setOtherLinks([]);
  };

  const updateFormField = (field: keyof AllocatedLandFormState, value: any) => {
    setForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const openAddForm = () => {
    if (!hasPermission('allocated_lands', 'canAdd')) {
      toast.error('لا تملك صلاحية الإضافة');
      return;
    }

    setFormMode('add');
    setSelectedLand(null);
    setForm(emptyForm);
    resetAttachmentLinks();
    setFormOpen(true);
    setTimeout(() => {
      document.getElementById('allocated-land-form')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 50);
  };

  const openEditForm = (land: any) => {
    if (!hasPermission('allocated_lands', 'canEdit')) {
      toast.error('لا تملك صلاحية التعديل');
      return;
    }

    const coordinates = parseCoordinates(land.coordinates);

    setFormMode('edit');
    setSelectedLand(land);
    setForm({
      propertyDescription: land.propertyDescription || '',
      plotNumber: land.plotNumber || '',
      planNumber: land.planNumber || '',
      area: String(land.area || ''),
      usageType: land.usageType || 'residential',
      region: land.region || 'المنطقة الشرقية',
      city: land.city || '',
      district: land.district || '',
      latitude: coordinates ? String(coordinates.latitude) : '',
      longitude: coordinates ? String(coordinates.longitude) : '',
      googleEarthLink: land.googleEarthLink || '',
      notes: land.notes || '',
      attachments: getLandAttachments(land),
    });
    resetAttachmentLinks();
    setFormOpen(true);
    setTimeout(() => {
      document.getElementById('allocated-land-form')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 50);
  };

  const openDetails = (land: AllocatedLand) => {
    setSelectedLand(land);
    setDetailsOpen(true);
  };

  const requestDelete = (land: AllocatedLand) => {
    if (!hasPermission('allocated_lands', 'canDelete')) {
      toast.error('لا تملك صلاحية الحذف');
      return;
    }

    setLandToDelete(land);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!landToDelete) return;

    try {
      await deleteAllocatedLand(landToDelete.id);
      toast.success('تم حذف الأرض المخصصة بنجاح');
      setDeleteDialogOpen(false);
      setLandToDelete(null);
    } catch (error) {
      console.error('Error deleting allocated land:', error);
      toast.error('فشل في حذف السجل');
    }
  };

  const validateForm = () => {
    if (!form.propertyDescription.trim()) {
      toast.error('بيان العقار مطلوب');
      return false;
    }

    if (!form.plotNumber.trim()) {
      toast.error('رقم القطعة مطلوب');
      return false;
    }

    if (!form.planNumber.trim()) {
      toast.error('رقم المخطط مطلوب');
      return false;
    }

    if (!form.area || Number(form.area) <= 0) {
      toast.error('المساحة يجب أن تكون أكبر من صفر');
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

    return true;
  };

  const buildPayload = () => {
    const coordinates = buildCoordinatesString(form.latitude, form.longitude);
    const existingAttachments = form.attachments || [];

    const attachments = [
      ...existingAttachments,
      ...makeAttachments(contractLinks, 'contract_image'),
      ...makeAttachments(planLinks, 'plan_image'),
      ...makeAttachments(siteLinks, 'location_image'),
      ...makeAttachments(otherLinks, 'other'),
    ];

    return {
      propertyDescription: form.propertyDescription.trim(),
      plotNumber: form.plotNumber.trim(),
      planNumber: form.planNumber.trim(),
      area: Number(form.area || 0),
      usageType: form.usageType as any,
      region: form.region.trim(),
      city: form.city.trim(),
      district: form.district.trim(),
      coordinates: coordinates || undefined,
      googleEarthLink:
        form.googleEarthLink.trim() ||
        (coordinates ? `https://earth.google.com/web/search/${coordinates}` : undefined),
      notes: form.notes.trim(),
      attachments,
      createdBy: currentUser?.uid || 'system',
    };
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    setIsSaving(true);

    try {
      const payload = buildPayload();

      if (formMode === 'add') {
        await addAllocatedLand(payload as any);
        toast.success('تمت إضافة الأرض المخصصة بنجاح');
      } else if (selectedLand) {
        await updateAllocatedLand(selectedLand.id, payload as any);
        toast.success('تم تحديث بيانات الأرض المخصصة بنجاح');
      }

      setFormOpen(false);
      setSelectedLand(null);
      setForm(emptyForm);
      resetAttachmentLinks();
    } catch (error) {
      console.error('Error saving allocated land:', error);
      toast.error('فشل في حفظ بيانات الأرض المخصصة');
    } finally {
      setIsSaving(false);
    }
  };

  const removeExistingAttachment = (url: string) => {
    setForm((prev) => ({
      ...prev,
      attachments: prev.attachments.filter((attachment) => attachment.driveUrl !== url),
    }));
  };

  const openMap = (land: any) => {
    if (!land.coordinates) {
      toast.error('لا توجد إحداثيات لهذا السجل');
      return;
    }

    window.open(`https://www.google.com/maps/search/?api=1&query=${land.coordinates}`, '_blank');
  };

  const mapCoordinates = form.latitude && form.longitude
    ? {
        latitude: Number(form.latitude),
        longitude: Number(form.longitude),
      }
    : undefined;

  const setCoordinatesFromMap = (coordinates: Coordinates) => {
    updateFormField('latitude', coordinates.latitude.toFixed(6));
    updateFormField('longitude', coordinates.longitude.toFixed(6));
  };

  return (
    <div className="container mx-auto p-4 md:p-6 space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">الأراضي المخصصة</h1>
          <p className="text-muted-foreground mt-1">
            إدارة الأراضي المخصصة للجامعة مع بيانات القطع والمخططات والمواقع والمرفقات.
          </p>
        </div>

        {hasPermission('allocated_lands', 'canAdd') && (
          <Button onClick={openAddForm} className="w-full lg:w-auto">
            <Plus className="ml-2 h-4 w-4" />
            إضافة أرض مخصصة
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">إجمالي السجلات</p>
              <p className="text-2xl font-bold">{allocatedLandsSafe.length}</p>
            </div>
            <FileText className="h-9 w-9 text-primary" />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">إجمالي المساحات</p>
              <p className="text-2xl font-bold">{totalArea.toLocaleString()} م²</p>
            </div>
            <Ruler className="h-9 w-9 text-primary" />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">المدن</p>
              <p className="text-2xl font-bold">{availableCities.length}</p>
            </div>
            <MapPin className="h-9 w-9 text-primary" />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">نتائج البحث</p>
              <p className="text-2xl font-bold">{filteredLands.length}</p>
            </div>
            <BarChart3 className="h-9 w-9 text-primary" />
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
            ابحث ببيان العقار أو رقم القطعة أو المخطط أو المدينة أو الحي.
          </CardDescription>
        </CardHeader>

        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div className="relative md:col-span-2">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="بحث في الأراضي المخصصة..."
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
              value={filterUsageType}
              onChange={(e) => setFilterUsageType(e.target.value)}
            >
              <option value="">جميع الاستخدامات</option>
              {usageTypeOptions.map((usageType) => (
                <option key={usageType.value} value={usageType.value}>
                  {usageType.label}
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
            قائمة الأراضي المخصصة ({filteredLands.length})
          </CardTitle>
        </CardHeader>

        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>بيان العقار</TableHead>
                  <TableHead>القطعة / المخطط</TableHead>
                  <TableHead>المساحة</TableHead>
                  <TableHead>نوع الاستخدام</TableHead>
                  <TableHead>المدينة / الحي</TableHead>
                  <TableHead>المرفقات</TableHead>
                  <TableHead className="text-center">الإجراءات</TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {filteredLands.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground py-12">
                      <FileText className="h-12 w-12 mx-auto mb-3 opacity-30" />
                      لا توجد أراضٍ مخصصة مطابقة للبحث.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredLands.map((land: any) => (
                    <TableRow key={land.id}>
                      <TableCell className="font-medium max-w-[240px] truncate">
                        {land.propertyDescription || '-'}
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
                        <Badge variant="outline">{getUsageLabel(land.usageType)}</Badge>
                      </TableCell>

                      <TableCell>
                        <div>
                          <p className="font-medium">{land.city || '-'}</p>
                          <p className="text-xs text-muted-foreground">{land.district || '-'}</p>
                        </div>
                      </TableCell>

                      <TableCell>
                        <Badge variant="secondary">
                          {getLandAttachments(land).length}
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

                          {hasPermission('allocated_lands', 'canEdit') && (
                            <Button
                              variant="ghost"
                              size="icon"
                              title="تعديل"
                              onClick={() => openEditForm(land)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                          )}

                          {land.coordinates && (
                            <Button
                              variant="ghost"
                              size="icon"
                              title="فتح الخريطة"
                              onClick={() => openMap(land)}
                            >
                              <MapPin className="h-4 w-4 text-primary" />
                            </Button>
                          )}

                          {hasPermission('allocated_lands', 'canDelete') && (
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
        <div id="allocated-land-form" className="rounded-xl border bg-card p-4 md:p-6 shadow-sm">
          <div className="mb-5 flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div>
              <h2 className="text-xl md:text-2xl font-bold">
                {formMode === 'add' ? 'إضافة أرض مخصصة' : 'تعديل أرض مخصصة'}
              </h2>
              <p className="text-sm text-muted-foreground mt-1">
                أدخل بيانات الأرض المخصصة في نفس الصفحة ثم اضغط حفظ.
              </p>
            </div>

            <Button
              variant="outline"
              onClick={() => {
                setFormOpen(false);
                setSelectedLand(null);
                setForm(emptyForm);
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
                <CardTitle className="text-base">البيانات الأساسية</CardTitle>
              </CardHeader>

              <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2 md:col-span-3">
                  <Label>بيان العقار *</Label>
                  <Textarea
                    value={form.propertyDescription}
                    onChange={(e) => updateFormField('propertyDescription', e.target.value)}
                    rows={3}
                    placeholder="أدخل بيان العقار..."
                  />
                </div>

                <div className="space-y-2">
                  <Label>رقم القطعة *</Label>
                  <Input
                    value={form.plotNumber}
                    onChange={(e) => updateFormField('plotNumber', e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label>رقم المخطط *</Label>
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
                  />
                </div>

                <div className="space-y-2">
                  <Label>نوع الاستخدام</Label>
                  <NativeSelect
                    value={form.usageType}
                    onChange={(e) => updateFormField('usageType', e.target.value)}
                  >
                    {usageTypeOptions.map((usageType) => (
                      <option key={usageType.value} value={usageType.value}>
                        {usageType.label}
                      </option>
                    ))}
                  </NativeSelect>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">الموقع والإحداثيات</CardTitle>
              </CardHeader>

              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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

                  <div className="space-y-2">
                    <Label>رابط Google Earth</Label>
                    <Input
                      value={form.googleEarthLink}
                      onChange={(e) => updateFormField('googleEarthLink', e.target.value)}
                      placeholder="اختياري"
                    />
                  </div>
                </div>

                <MapCoordinatePicker
                  coordinates={mapCoordinates}
                  onChange={setCoordinatesFromMap}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">المرفقات والصور</CardTitle>
                <CardDescription>
                  يتم رفع الملفات إلى Google Drive وحفظ روابطها مع السجل.
                </CardDescription>
              </CardHeader>

              <CardContent>
                <Tabs defaultValue="contract" className="w-full">
                  <TabsList className="grid w-full grid-cols-2 md:grid-cols-4 h-auto">
                    <TabsTrigger value="contract">مستند التخصيص</TabsTrigger>
                    <TabsTrigger value="plan">المخطط</TabsTrigger>
                    <TabsTrigger value="site">صور الموقع</TabsTrigger>
                    <TabsTrigger value="other">أخرى</TabsTrigger>
                  </TabsList>

                  <TabsContent value="contract" className="mt-4">
                    <FileUploadZone
                      label="مستند التخصيص"
                      existingFiles={filterAttachments(form.attachments, 'contract_image').map((item) => ({
                        name: item.title,
                        url: item.driveUrl,
                      }))}
                      onDeleteExisting={removeExistingAttachment}
                      onLinksChange={setContractLinks}
                      maxFiles={10}
                      maxSizeMB={10}
                      accept="image/*,.pdf"
                    />
                  </TabsContent>

                  <TabsContent value="plan" className="mt-4">
                    <FileUploadZone
                      label="صور المخطط"
                      existingFiles={filterAttachments(form.attachments, 'plan_image').map((item) => ({
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
                      existingFiles={filterAttachments(form.attachments, 'location_image').map((item) => ({
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
                      existingFiles={filterAttachments(form.attachments, 'other').map((item) => ({
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

            <Card>
              <CardHeader>
                <CardTitle className="text-base">الملاحظات</CardTitle>
              </CardHeader>

              <CardContent>
                <Textarea
                  value={form.notes}
                  onChange={(e) => updateFormField('notes', e.target.value)}
                  rows={4}
                  placeholder="أي ملاحظات إضافية..."
                />
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

      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent className="max-w-5xl max-h-[92vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>تفاصيل الأرض المخصصة</DialogTitle>
          </DialogHeader>

          {selectedLand && (
            <div className="space-y-5">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div>
                  <h2 className="text-xl font-bold">
                    {(selectedLand as any).propertyDescription || 'أرض مخصصة'}
                  </h2>
                  <p className="text-muted-foreground">
                    قطعة رقم: {(selectedLand as any).plotNumber || '-'} — مخطط: {(selectedLand as any).planNumber || '-'}
                  </p>
                </div>

                <Badge variant="outline">
                  {getUsageLabel((selectedLand as any).usageType)}
                </Badge>
              </div>

              <Separator />

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <InfoItem label="رقم القطعة" value={(selectedLand as any).plotNumber || '-'} />
                <InfoItem label="رقم المخطط" value={(selectedLand as any).planNumber || '-'} />
                <InfoItem label="المساحة" value={`${Number((selectedLand as any).area || 0).toLocaleString()} م²`} />
                <InfoItem label="نوع الاستخدام" value={getUsageLabel((selectedLand as any).usageType)} />
                <InfoItem label="المنطقة" value={(selectedLand as any).region || '-'} />
                <InfoItem label="المدينة" value={(selectedLand as any).city || '-'} />
                <InfoItem label="الحي" value={(selectedLand as any).district || '-'} />
                <InfoItem label="الإحداثيات" value={(selectedLand as any).coordinates || '-'} />
                <InfoItem label="رابط Google Earth" value={(selectedLand as any).googleEarthLink ? 'متوفر' : '-'} />
              </div>

              {(selectedLand as any).notes && (
                <InfoBlock label="الملاحظات" value={(selectedLand as any).notes} />
              )}

              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Paperclip className="h-4 w-4" />
                    المرفقات
                  </CardTitle>
                </CardHeader>

                <CardContent>
                  <AttachmentGroups attachments={getLandAttachments(selectedLand)} />
                </CardContent>
              </Card>

              <div className="flex flex-col md:flex-row justify-end gap-2">
                {(selectedLand as any).coordinates && (
                  <Button variant="outline" onClick={() => openMap(selectedLand)}>
                    <MapPin className="ml-2 h-4 w-4" />
                    فتح على الخريطة
                  </Button>
                )}

                {hasPermission('allocated_lands', 'canEdit') && (
                  <Button onClick={() => openEditForm(selectedLand)}>
                    <Edit className="ml-2 h-4 w-4" />
                    تعديل البيانات
                  </Button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>حذف الأرض المخصصة</AlertDialogTitle>
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
      <p className="font-medium break-words">{value}</p>
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
