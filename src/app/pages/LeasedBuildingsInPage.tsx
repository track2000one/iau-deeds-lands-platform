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
  Building2,
  CalendarDays,
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
import type { LeasedBuildingOut, LeasedBuildingIn } from '../../types/models';

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

type PartyFormState = {
  name: string;
  commercialRegistration: string;
  entityRepresentative: string;
  identityNumber: string;
  nationality: string;
  mobileNumber: string;
};

type BuildingFormState = {
  party: PartyFormState;
  contractNumber: string;
  buildingNumber: string;
  planNumber: string;
  locationName: string;
  area: string;
  region: string;
  city: string;
  district: string;
  latitude: string;
  longitude: string;
  rentAmount: string;
  notes: string;
  attachments: AttachmentItem[];
};

const emptyParty: PartyFormState = {
  name: '',
  commercialRegistration: '',
  entityRepresentative: '',
  identityNumber: '',
  nationality: '',
  mobileNumber: '',
};

const emptyForm: BuildingFormState = {
  party: emptyParty,
  contractNumber: '',
  buildingNumber: '',
  planNumber: '',
  locationName: '',
  area: '',
  region: 'المنطقة الشرقية',
  city: '',
  district: '',
  latitude: '',
  longitude: '',
  rentAmount: '',
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

const parseCoordinates = (coordinates?: string): Coordinates | undefined => {
  if (!coordinates) return undefined;
  const [lat, lng] = coordinates.split(',').map((part) => Number(part.trim()));
  if (Number.isNaN(lat) || Number.isNaN(lng)) return undefined;
  return { latitude: lat, longitude: lng };
};

const buildCoordinatesString = (latitude: string, longitude: string) => {
  if (!latitude || !longitude) return '';
  const lat = Number(latitude);
  const lng = Number(longitude);
  if (Number.isNaN(lat) || Number.isNaN(lng)) return '';
  return `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
};

const getRecordAttachments = (record: any): AttachmentItem[] => {
  return Array.isArray(record?.attachments) ? record.attachments : [];
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
          <p className="text-xs text-muted-foreground mt-1">{attachment.attachmentType}</p>
        </a>
      ))}
    </div>
  );
};

export const LeasedBuildingsInPage: React.FC = () => {
  const { currentUser } = useAuth();
  const {
    leasedBuildingsIn,
    addLeasedBuildingIn,
    updateLeasedBuildingIn,
    deleteLeasedBuildingIn,
  } = useData();
  const { hasPermission } = usePermissions();

  const [searchQuery, setSearchQuery] = useState('');
  const [filterCity, setFilterCity] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const [selectedRecord, setSelectedRecord] = useState<LeasedBuildingIn | null>(null);
  const [recordToDelete, setRecordToDelete] = useState<LeasedBuildingIn | null>(null);
  const [formMode, setFormMode] = useState<'add' | 'edit'>('add');
  const [form, setForm] = useState<BuildingFormState>(emptyForm);
  const [isSaving, setIsSaving] = useState(false);
  const [showMap, setShowMap] = useState(false);

  const [contractLinks, setContractLinks] = useState<{ title: string; url: string }[]>([]);
  const [planLinks, setPlanLinks] = useState<{ title: string; url: string }[]>([]);
  const [siteLinks, setSiteLinks] = useState<{ title: string; url: string }[]>([]);
  const [otherLinks, setOtherLinks] = useState<{ title: string; url: string }[]>([]);

  const recordsSafe = Array.isArray(leasedBuildingsIn) ? leasedBuildingsIn : [];

  const filteredRecords = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    return recordsSafe.filter((record: any) => {
      const matchesSearch =
        !query ||
        [
          record.owner?.name,
          record.owner?.commercialRegistration,
          record.owner?.entityRepresentative,
          record.contractNumber,
          record.buildingNumber,
          record.planNumber,
          record.locationName,
          record.area,
          record.region,
          record.city,
          record.district,
          record.coordinates,
          record.rentAmount,
          record.notes,
        ]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(query));

      const matchesCity = !filterCity || record.city === filterCity;
      return matchesSearch && matchesCity;
    });
  }, [recordsSafe, searchQuery, filterCity]);

  const totalArea = useMemo(() => recordsSafe.reduce((sum: number, item: any) => sum + Number(item.area || 0), 0), [recordsSafe]);
  const totalRent = useMemo(() => recordsSafe.reduce((sum: number, item: any) => sum + Number(item.rentAmount || 0), 0), [recordsSafe]);
  const availableCities = useMemo(() => Array.from(new Set(recordsSafe.map((item: any) => item.city).filter(Boolean))).sort(), [recordsSafe]);

  const resetAttachmentLinks = () => {
    setContractLinks([]);
    setPlanLinks([]);
    setSiteLinks([]);
    setOtherLinks([]);
  };

  const updateFormField = (field: keyof BuildingFormState, value: any) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const updatePartyField = (field: keyof PartyFormState, value: string) => {
    setForm((prev) => ({
      ...prev,
      party: {
        ...prev.party,
        [field]: value,
      },
    }));
  };

  const openAddForm = () => {
    if (!hasPermission('leased_buildings_in', 'canAdd')) {
      toast.error('لا تملك صلاحية الإضافة');
      return;
    }

    setFormMode('add');
    setSelectedRecord(null);
    setDetailsOpen(false);
    setForm(emptyForm);
    setShowMap(false);
    resetAttachmentLinks();
    setFormOpen(true);
    setTimeout(() => document.getElementById('leased-building-in-form')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);
  };

  const openEditForm = (record: any) => {
    if (!hasPermission('leased_buildings_in', 'canEdit')) {
      toast.error('لا تملك صلاحية التعديل');
      return;
    }

    const coordinates = parseCoordinates(record.coordinates);

    setFormMode('edit');
    setDetailsOpen(false);
    setSelectedRecord(record);
    setForm({
      party: {
        name: record.owner?.name || '',
        commercialRegistration: record.owner?.commercialRegistration || '',
        entityRepresentative: record.owner?.entityRepresentative || '',
        identityNumber: record.owner?.identityNumber || '',
        nationality: record.owner?.nationality || '',
        mobileNumber: record.owner?.mobileNumber || '',
      },
      contractNumber: record.contractNumber || '',
      buildingNumber: record.buildingNumber || '',
      planNumber: record.planNumber || '',
      locationName: record.locationName || '',
      area: String(record.area || ''),
      region: record.region || 'المنطقة الشرقية',
      city: record.city || '',
      district: record.district || '',
      latitude: coordinates ? String(coordinates.latitude) : '',
      longitude: coordinates ? String(coordinates.longitude) : '',
      rentAmount: record.rentAmount ? String(record.rentAmount) : '',
      notes: record.notes || '',
      attachments: getRecordAttachments(record),
    });
    setShowMap(false);
    resetAttachmentLinks();
    setFormOpen(true);
    setTimeout(() => document.getElementById('leased-building-in-form')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);
  };

  const openDetails = (record: LeasedBuildingIn) => {
    setSelectedRecord(record);
    setFormOpen(false);
    setDetailsOpen(true);
    setTimeout(() => document.getElementById('leased-building-in-details')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);
  };

  const requestDelete = (record: LeasedBuildingIn) => {
    if (!hasPermission('leased_buildings_in', 'canDelete')) {
      toast.error('لا تملك صلاحية الحذف');
      return;
    }

    setRecordToDelete(record);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!recordToDelete) return;

    try {
      await deleteLeasedBuildingIn(recordToDelete.id);
      toast.success('تم حذف السجل بنجاح');
      setDeleteDialogOpen(false);
      setRecordToDelete(null);
    } catch (error) {
      console.error('Error deleting building:', error);
      toast.error('فشل في حذف السجل');
    }
  };

  const validateForm = () => {
    if (!form.party.name.trim()) {
      toast.error('اسم المالك مطلوب');
      return false;
    }

    if (!form.contractNumber.trim()) {
      toast.error('رقم العقد مطلوب');
      return false;
    }

    if (!form.buildingNumber.trim()) {
      toast.error('رقم المبنى مطلوب');
      return false;
    }

    if (!form.locationName.trim()) {
      toast.error('اسم الموقع مطلوب');
      return false;
    }

    if (!form.area || Number(form.area) <= 0) {
      toast.error('المساحة يجب أن تكون أكبر من صفر');
      return false;
    }

    return true;
  };

  const buildPayload = () => {
    const coordinates = buildCoordinatesString(form.latitude, form.longitude);
    const attachments = [
      ...form.attachments,
      ...makeAttachments(contractLinks, 'contract_image'),
      ...makeAttachments(planLinks, 'plan_image'),
      ...makeAttachments(siteLinks, 'location_image'),
      ...makeAttachments(otherLinks, 'other'),
    ];

    return {
      owner: {
        ...form.party,
        name: form.party.name.trim(),
      },
      contractNumber: form.contractNumber.trim(),
      buildingNumber: form.buildingNumber.trim(),
      planNumber: form.planNumber.trim() || undefined,
      locationName: form.locationName.trim(),
      area: Number(form.area || 0),
      region: form.region.trim(),
      city: form.city.trim(),
      district: form.district.trim(),
      coordinates: coordinates || undefined,
      rentAmount: form.rentAmount ? Number(form.rentAmount) : undefined,
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
        await addLeasedBuildingIn(payload as any);
        toast.success('تمت إضافة السجل بنجاح');
      } else if (selectedRecord) {
        await updateLeasedBuildingIn(selectedRecord.id, payload as any);
        toast.success('تم تحديث السجل بنجاح');
      }

      setFormOpen(false);
      setSelectedRecord(null);
      setForm(emptyForm);
      setShowMap(false);
      resetAttachmentLinks();
    } catch (error) {
      console.error('Error saving building:', error);
      toast.error('فشل في حفظ البيانات');
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

  const openMap = (record: any) => {
    if (!record.coordinates) {
      toast.error('لا توجد إحداثيات لهذا السجل');
      return;
    }
    window.open(`https://www.google.com/maps/search/?api=1&query=${record.coordinates}`, '_blank');
  };

  const mapCoordinates = form.latitude && form.longitude
    ? { latitude: Number(form.latitude), longitude: Number(form.longitude) }
    : undefined;

  const setCoordinatesFromMap = (coordinates: Coordinates) => {
    updateFormField('latitude', coordinates.latitude.toFixed(6));
    updateFormField('longitude', coordinates.longitude.toFixed(6));
  };

  return (
    <div className="container mx-auto p-4 md:p-6 space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">المباني المستأجرة للجامعة</h1>
          <p className="text-muted-foreground mt-1">إدارة عقود استئجار المباني لصالح الجامعة مع بيانات المالك والموقع والمرفقات.</p>
        </div>

        {hasPermission('leased_buildings_in', 'canAdd') && (
          <Button onClick={openAddForm} className="w-full lg:w-auto">
            <Plus className="ml-2 h-4 w-4" />
            إضافة مبنى مستأجر
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">إجمالي السجلات</p>
              <p className="text-2xl font-bold">{recordsSafe.length}</p>
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
              <p className="text-sm text-muted-foreground">إجمالي الإيجارات</p>
              <p className="text-2xl font-bold">{totalRent.toLocaleString()} ريال</p>
            </div>
            <BarChart3 className="h-9 w-9 text-primary" />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">نتائج البحث</p>
              <p className="text-2xl font-bold">{filteredRecords.length}</p>
            </div>
            <Search className="h-9 w-9 text-primary" />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Filter className="h-5 w-5" /> البحث والتصفية</CardTitle>
          <CardDescription>ابحث باسم المالك أو رقم العقد أو المبنى أو الموقع.</CardDescription>
        </CardHeader>

        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div className="relative md:col-span-3">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="بحث في السجلات..." className="pr-9" />
            </div>

            <NativeSelect value={filterCity} onChange={(e) => setFilterCity(e.target.value)}>
              <option value="">جميع المدن</option>
              {availableCities.map((city) => (
                <option key={city} value={city}>{city}</option>
              ))}
            </NativeSelect>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><BarChart3 className="h-5 w-5" /> قائمة السجلات ({filteredRecords.length})</CardTitle>
        </CardHeader>

        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>المالك</TableHead>
                  <TableHead>رقم العقد</TableHead>
                  <TableHead>رقم المبنى</TableHead>
                  <TableHead>اسم الموقع</TableHead>
                  <TableHead>المدينة</TableHead>
                  <TableHead>المساحة</TableHead>
                  <TableHead>الإيجار</TableHead>
                  <TableHead>المرفقات</TableHead>
                  <TableHead className="text-center">الإجراءات</TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {filteredRecords.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center text-muted-foreground py-12">
                      <Building2 className="h-12 w-12 mx-auto mb-3 opacity-30" />
                      لا توجد سجلات مطابقة للبحث.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredRecords.map((record: any) => (
                    <TableRow key={record.id}>
                      <TableCell className="font-medium">{record.owner?.name || '-'}</TableCell>
                      <TableCell>{record.contractNumber || '-'}</TableCell>
                      <TableCell>{record.buildingNumber || '-'}</TableCell>
                      <TableCell>{record.locationName || '-'}</TableCell>
                      <TableCell>{record.city || '-'}</TableCell>
                      <TableCell>{Number(record.area || 0).toLocaleString()} م²</TableCell>
                      <TableCell>
                        {record.rentAmount ? <Badge>{Number(record.rentAmount).toLocaleString()} ريال</Badge> : '-'}
                      </TableCell>
                      <TableCell><Badge variant="secondary">{getRecordAttachments(record).length}</Badge></TableCell>
                      <TableCell>
                        <div className="flex items-center justify-center gap-1">
                          <Button variant="ghost" size="icon" title="عرض" onClick={() => openDetails(record)}>
                            <Eye className="h-4 w-4" />
                          </Button>

                          {hasPermission('leased_buildings_in', 'canEdit') && (
                            <Button variant="ghost" size="icon" title="تعديل" onClick={() => openEditForm(record)}>
                              <Edit className="h-4 w-4" />
                            </Button>
                          )}

                          {record.coordinates && (
                            <Button variant="ghost" size="icon" title="فتح الخريطة" onClick={() => openMap(record)}>
                              <MapPin className="h-4 w-4 text-primary" />
                            </Button>
                          )}

                          {hasPermission('leased_buildings_in', 'canDelete') && (
                            <Button variant="ghost" size="icon" title="حذف" onClick={() => requestDelete(record)}>
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
        <BuildingForm
          formId="leased-building-in-form"
          formTitle={formMode === 'add' ? 'إضافة مبنى مستأجر' : 'تعديل مبنى مستأجر'}
          partyLabel="المالك"
          form={form}
          isSaving={isSaving}
          showMap={showMap}
          mapCoordinates={mapCoordinates}
          setShowMap={setShowMap}
          updateFormField={updateFormField}
          updatePartyField={updatePartyField}
          setCoordinatesFromMap={setCoordinatesFromMap}
          handleSubmit={handleSubmit}
          closeForm={() => {
            setFormOpen(false);
            setSelectedRecord(null);
            setForm(emptyForm);
            setShowMap(false);
            resetAttachmentLinks();
          }}
          removeExistingAttachment={removeExistingAttachment}
          setContractLinks={setContractLinks}
          setPlanLinks={setPlanLinks}
          setSiteLinks={setSiteLinks}
          setOtherLinks={setOtherLinks}
        />
      )}

      {detailsOpen && selectedRecord && (
        <div id="leased-building-in-details" className="rounded-xl border bg-card p-4 md:p-6 shadow-sm">
          <div className="mb-5 flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div>
              <h2 className="text-xl md:text-2xl font-bold">تفاصيل المبنى المستأجر</h2>
              <p className="text-sm text-muted-foreground mt-1">عرض بيانات العقد والموقع والمرفقات داخل نفس الصفحة.</p>
            </div>

            <Button variant="outline" onClick={() => { setDetailsOpen(false); setSelectedRecord(null); }} className="w-full md:w-auto">
              <X className="ml-2 h-4 w-4" />
              إغلاق التفاصيل
            </Button>
          </div>

          <div className="space-y-5">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div>
                <h3 className="text-xl font-bold">{(selectedRecord as any).locationName || 'مبنى مستأجر'}</h3>
                <p className="text-muted-foreground">رقم المبنى: {(selectedRecord as any).buildingNumber || '-'}</p>
              </div>
              {(selectedRecord as any).rentAmount && <Badge>{Number((selectedRecord as any).rentAmount).toLocaleString()} ريال</Badge>}
            </div>

            <Separator />

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <InfoItem label="المالك" value={(selectedRecord as any).owner?.name || '-'} />
              <InfoItem label="السجل التجاري" value={(selectedRecord as any).owner?.commercialRegistration || '-'} />
              <InfoItem label="ممثل الجهة" value={(selectedRecord as any).owner?.entityRepresentative || '-'} />
              <InfoItem label="رقم العقد" value={(selectedRecord as any).contractNumber || '-'} />
              <InfoItem label="رقم المبنى" value={(selectedRecord as any).buildingNumber || '-'} />
              <InfoItem label="رقم المخطط" value={(selectedRecord as any).planNumber || '-'} />
              <InfoItem label="اسم الموقع" value={(selectedRecord as any).locationName || '-'} />
              <InfoItem label="المساحة" value={`${Number((selectedRecord as any).area || 0).toLocaleString()} م²`} />
              <InfoItem label="المنطقة" value={(selectedRecord as any).region || '-'} />
              <InfoItem label="المدينة" value={(selectedRecord as any).city || '-'} />
              <InfoItem label="الحي" value={(selectedRecord as any).district || '-'} />
              <InfoItem label="الإحداثيات" value={(selectedRecord as any).coordinates || '-'} />
              <InfoItem label="قيمة الإيجار" value={(selectedRecord as any).rentAmount ? `${Number((selectedRecord as any).rentAmount).toLocaleString()} ريال` : '-'} />
            </div>

            {(selectedRecord as any).notes && <InfoBlock label="الملاحظات" value={(selectedRecord as any).notes} />}

            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2"><Paperclip className="h-4 w-4" /> المرفقات</CardTitle>
              </CardHeader>
              <CardContent>
                <AttachmentGroups attachments={getRecordAttachments(selectedRecord)} />
              </CardContent>
            </Card>

            <div className="flex flex-col md:flex-row justify-end gap-2">
              {(selectedRecord as any).coordinates && (
                <Button variant="outline" onClick={() => openMap(selectedRecord)}>
                  <MapPin className="ml-2 h-4 w-4" />
                  فتح على الخريطة
                </Button>
              )}

              {hasPermission('leased_buildings_in', 'canEdit') && (
                <Button onClick={() => openEditForm(selectedRecord)}>
                  <Edit className="ml-2 h-4 w-4" />
                  تعديل البيانات
                </Button>
              )}
            </div>
          </div>
        </div>
      )}

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>حذف السجل</AlertDialogTitle>
            <AlertDialogDescription>هل أنت متأكد من حذف هذا السجل؟ لا يمكن التراجع عن هذا الإجراء.</AlertDialogDescription>
          </AlertDialogHeader>

          <AlertDialogFooter>
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              حذف
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

type BuildingFormProps = {
  formId: string;
  formTitle: string;
  partyLabel: string;
  form: BuildingFormState;
  isSaving: boolean;
  showMap: boolean;
  mapCoordinates?: Coordinates;
  setShowMap: React.Dispatch<React.SetStateAction<boolean>>;
  updateFormField: (field: keyof BuildingFormState, value: any) => void;
  updatePartyField: (field: keyof PartyFormState, value: string) => void;
  setCoordinatesFromMap: (coordinates: Coordinates) => void;
  handleSubmit: () => void;
  closeForm: () => void;
  removeExistingAttachment: (url: string) => void;
  setContractLinks: React.Dispatch<React.SetStateAction<{ title: string; url: string }[]>>;
  setPlanLinks: React.Dispatch<React.SetStateAction<{ title: string; url: string }[]>>;
  setSiteLinks: React.Dispatch<React.SetStateAction<{ title: string; url: string }[]>>;
  setOtherLinks: React.Dispatch<React.SetStateAction<{ title: string; url: string }[]>>;
};

const BuildingForm: React.FC<BuildingFormProps> = ({
  formId,
  formTitle,
  partyLabel,
  form,
  isSaving,
  showMap,
  mapCoordinates,
  setShowMap,
  updateFormField,
  updatePartyField,
  setCoordinatesFromMap,
  handleSubmit,
  closeForm,
  removeExistingAttachment,
  setContractLinks,
  setPlanLinks,
  setSiteLinks,
  setOtherLinks,
}) => {
  return (
    <div id={formId} className="rounded-xl border bg-card p-4 md:p-6 shadow-sm">
      <div className="mb-5 flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl md:text-2xl font-bold">{formTitle}</h2>
          <p className="text-sm text-muted-foreground mt-1">أدخل بيانات العقد والمبنى والموقع والمرفقات داخل نفس الصفحة.</p>
        </div>

        <Button variant="outline" onClick={closeForm} disabled={isSaving} className="w-full md:w-auto">
          <X className="ml-2 h-4 w-4" />
          إغلاق النموذج
        </Button>
      </div>

      <div className="space-y-6">
        <Card>
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><Building2 className="h-4 w-4" /> بيانات {partyLabel}</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2"><Label>اسم {partyLabel} *</Label><Input value={form.party.name} onChange={(e) => updatePartyField('name', e.target.value)} /></div>
            <div className="space-y-2"><Label>السجل التجاري</Label><Input value={form.party.commercialRegistration} onChange={(e) => updatePartyField('commercialRegistration', e.target.value)} /></div>
            <div className="space-y-2"><Label>ممثل الجهة</Label><Input value={form.party.entityRepresentative} onChange={(e) => updatePartyField('entityRepresentative', e.target.value)} /></div>
            <div className="space-y-2"><Label>رقم الهوية</Label><Input value={form.party.identityNumber} onChange={(e) => updatePartyField('identityNumber', e.target.value)} /></div>
            <div className="space-y-2"><Label>الجنسية</Label><Input value={form.party.nationality} onChange={(e) => updatePartyField('nationality', e.target.value)} /></div>
            <div className="space-y-2"><Label>رقم الجوال</Label><Input value={form.party.mobileNumber} onChange={(e) => updatePartyField('mobileNumber', e.target.value)} /></div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><CalendarDays className="h-4 w-4" /> بيانات العقد والمبنى</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2"><Label>رقم العقد *</Label><Input value={form.contractNumber} onChange={(e) => updateFormField('contractNumber', e.target.value)} /></div>
            <div className="space-y-2"><Label>رقم المبنى *</Label><Input value={form.buildingNumber} onChange={(e) => updateFormField('buildingNumber', e.target.value)} /></div>
            <div className="space-y-2"><Label>رقم المخطط</Label><Input value={form.planNumber} onChange={(e) => updateFormField('planNumber', e.target.value)} /></div>
            <div className="space-y-2"><Label>اسم الموقع *</Label><Input value={form.locationName} onChange={(e) => updateFormField('locationName', e.target.value)} /></div>
            <div className="space-y-2"><Label>المساحة م² *</Label><Input type="number" value={form.area} onChange={(e) => updateFormField('area', e.target.value)} /></div>
            <div className="space-y-2"><Label>قيمة الإيجار</Label><Input type="number" value={form.rentAmount} onChange={(e) => updateFormField('rentAmount', e.target.value)} /></div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">الموقع والإحداثيات</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2"><Label>المنطقة</Label><Input value={form.region} onChange={(e) => updateFormField('region', e.target.value)} /></div>
              <div className="space-y-2">
                <Label>المدينة</Label>
                <NativeSelect value={form.city} onChange={(e) => updateFormField('city', e.target.value)}>
                  <option value="">اختر المدينة</option>
                  {cityOptions.map((city) => <option key={city} value={city}>{city}</option>)}
                </NativeSelect>
              </div>
              <div className="space-y-2"><Label>الحي</Label><Input value={form.district} onChange={(e) => updateFormField('district', e.target.value)} /></div>
              <div className="space-y-2"><Label>خط العرض</Label><Input value={form.latitude} onChange={(e) => updateFormField('latitude', e.target.value)} placeholder="26.392700" /></div>
              <div className="space-y-2"><Label>خط الطول</Label><Input value={form.longitude} onChange={(e) => updateFormField('longitude', e.target.value)} placeholder="50.043800" /></div>
            </div>

            <div className="rounded-lg border bg-muted/20 p-4">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div>
                  <p className="font-medium">الإحداثيات</p>
                  <p className="text-sm text-muted-foreground">{form.latitude && form.longitude ? `${form.latitude}, ${form.longitude}` : 'لم يتم تحديد الإحداثيات بعد.'}</p>
                </div>

                <Button type="button" variant="outline" onClick={() => setShowMap((prev) => !prev)}>
                  <MapPin className="ml-2 h-4 w-4" />
                  {showMap ? 'إخفاء الخريطة' : 'تحديد الموقع من الخريطة'}
                </Button>
              </div>

              {showMap && (
                <div className="mt-4">
                  <MapCoordinatePicker coordinates={mapCoordinates} onChange={setCoordinatesFromMap} />
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <AttachmentFormTabs
          attachments={form.attachments}
          removeExistingAttachment={removeExistingAttachment}
          setContractLinks={setContractLinks}
          setPlanLinks={setPlanLinks}
          setSiteLinks={setSiteLinks}
          setOtherLinks={setOtherLinks}
        />

        <Card>
          <CardHeader><CardTitle className="text-base">الملاحظات</CardTitle></CardHeader>
          <CardContent><Textarea value={form.notes} onChange={(e) => updateFormField('notes', e.target.value)} rows={4} placeholder="أي ملاحظات إضافية..." /></CardContent>
        </Card>

        <div className="flex flex-col-reverse md:flex-row justify-end gap-2">
          <Button variant="outline" onClick={closeForm} disabled={isSaving}><X className="ml-2 h-4 w-4" /> إلغاء</Button>
          <Button onClick={handleSubmit} disabled={isSaving}><Save className="ml-2 h-4 w-4" /> {isSaving ? 'جاري الحفظ...' : 'حفظ البيانات'}</Button>
        </div>
      </div>
    </div>
  );
};

type AttachmentFormTabsProps = {
  attachments: AttachmentItem[];
  removeExistingAttachment: (url: string) => void;
  setContractLinks: React.Dispatch<React.SetStateAction<{ title: string; url: string }[]>>;
  setPlanLinks: React.Dispatch<React.SetStateAction<{ title: string; url: string }[]>>;
  setSiteLinks: React.Dispatch<React.SetStateAction<{ title: string; url: string }[]>>;
  setOtherLinks: React.Dispatch<React.SetStateAction<{ title: string; url: string }[]>>;
};

const AttachmentFormTabs: React.FC<AttachmentFormTabsProps> = ({
  attachments,
  removeExistingAttachment,
  setContractLinks,
  setPlanLinks,
  setSiteLinks,
  setOtherLinks,
}) => (
  <Card>
    <CardHeader>
      <CardTitle className="text-base">المرفقات والصور</CardTitle>
      <CardDescription>يتم رفع الملفات إلى Google Drive وحفظ روابطها مع السجل.</CardDescription>
    </CardHeader>
    <CardContent>
      <Tabs defaultValue="contract" className="w-full">
        <TabsList className="grid w-full grid-cols-2 md:grid-cols-4 h-auto">
          <TabsTrigger value="contract">العقد</TabsTrigger>
          <TabsTrigger value="plan">المخطط</TabsTrigger>
          <TabsTrigger value="site">صور الموقع</TabsTrigger>
          <TabsTrigger value="other">أخرى</TabsTrigger>
        </TabsList>

        <TabsContent value="contract" className="mt-4">
          <FileUploadZone label="صورة العقد" existingFiles={filterAttachments(attachments, 'contract_image').map((item) => ({ name: item.title, url: item.driveUrl }))} onDeleteExisting={removeExistingAttachment} onLinksChange={setContractLinks} maxFiles={10} maxSizeMB={10} accept="image/*,.pdf" />
        </TabsContent>
        <TabsContent value="plan" className="mt-4">
          <FileUploadZone label="صور المخطط" existingFiles={filterAttachments(attachments, 'plan_image').map((item) => ({ name: item.title, url: item.driveUrl }))} onDeleteExisting={removeExistingAttachment} onLinksChange={setPlanLinks} maxFiles={10} maxSizeMB={10} accept="image/*,.pdf" />
        </TabsContent>
        <TabsContent value="site" className="mt-4">
          <FileUploadZone label="صور الموقع" existingFiles={filterAttachments(attachments, 'location_image').map((item) => ({ name: item.title, url: item.driveUrl }))} onDeleteExisting={removeExistingAttachment} onLinksChange={setSiteLinks} maxFiles={10} maxSizeMB={10} accept="image/*" />
        </TabsContent>
        <TabsContent value="other" className="mt-4">
          <FileUploadZone label="مرفقات إضافية" existingFiles={filterAttachments(attachments, 'other').map((item) => ({ name: item.title, url: item.driveUrl }))} onDeleteExisting={removeExistingAttachment} onLinksChange={setOtherLinks} maxFiles={10} maxSizeMB={10} accept="image/*,.pdf,.doc,.docx" />
        </TabsContent>
      </Tabs>
    </CardContent>
  </Card>
);
