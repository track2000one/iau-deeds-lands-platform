import React from 'react';
import {
  ArrowRight,
  Building2,
  Edit3,
  MapPin,
  Plus,
  Save,
  Search,
  Trash2,
  X,
} from 'lucide-react';
import { useNavigate } from 'react-router';
import { toast } from 'sonner';
import { useDeeds } from '../../context/DeedContext';
import { usePermissions } from '../../context/PermissionsContext';
import { investmentsApi } from '../../features/investments/api';
import type { InvestmentSite } from '../../features/investments/types';
import { MapCoordinatePicker } from '../components/MapCoordinatePicker';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { NativeSelect } from '../components/ui/native-select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../components/ui/table';
import { Textarea } from '../components/ui/textarea';

type SiteFormState = {
  code: string;
  name: string;
  description: string;
  deedId: string;
  latitude: string;
  longitude: string;
  region: string;
  city: string;
  district: string;
};

const EMPTY_FORM: SiteFormState = {
  code: '',
  name: '',
  description: '',
  deedId: '',
  latitude: '',
  longitude: '',
  region: '',
  city: '',
  district: '',
};

const normalizeCode = (value: string) =>
  value
    .trim()
    .toUpperCase()
    .replace(/\s+/g, '-')
    .replace(/[^A-Z0-9_-]/g, '');

export const InvestmentSitesPage: React.FC = () => {
  const navigate = useNavigate();
  const { deeds, loading: deedsLoading } = useDeeds();
  const { isAdmin, hasPermission } = usePermissions();

  const canAdd = isAdmin || hasPermission('investments', 'canAdd');
  const canEdit = isAdmin || hasPermission('investments', 'canEdit');
  const canDelete = isAdmin || hasPermission('investments', 'canDelete');

  const [sites, setSites] = React.useState<InvestmentSite[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [search, setSearch] = React.useState('');
  const [showForm, setShowForm] = React.useState(false);
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [form, setForm] = React.useState<SiteFormState>(EMPTY_FORM);

  const loadSites = React.useCallback(async () => {
    try {
      setLoading(true);
      const response = await investmentsApi.getSites({
        search: search.trim() || undefined,
        limit: 100,
      });
      setSites(response.items);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'تعذر تحميل المواقع الاستثمارية');
    } finally {
      setLoading(false);
    }
  }, [search]);

  React.useEffect(() => {
    const timer = window.setTimeout(loadSites, 200);
    return () => window.clearTimeout(timer);
  }, [loadSites]);

  const setField = <K extends keyof SiteFormState,>(
    key: K,
    value: SiteFormState[K]
  ) => {
    setForm((previous) => ({ ...previous, [key]: value }));
  };

  const selectedDeed = React.useMemo(
    () => deeds.find((deed) => deed.id === form.deedId) || null,
    [deeds, form.deedId]
  );

  const coordinateValue = React.useMemo(() => {
    if (!form.latitude.trim() || !form.longitude.trim()) return undefined;

    const latitude = Number(form.latitude);
    const longitude = Number(form.longitude);

    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return undefined;
    return { latitude, longitude };
  }, [form.latitude, form.longitude]);

  const openCreate = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setShowForm(true);
  };

  const openEdit = (site: InvestmentSite) => {
    setEditingId(site.id);
    setForm({
      code: site.code || '',
      name: site.name || '',
      description: site.description || '',
      deedId: site.deedId || '',
      latitude: site.latitude == null ? '' : String(site.latitude),
      longitude: site.longitude == null ? '' : String(site.longitude),
      region: site.region || '',
      city: site.city || '',
      district: site.district || '',
    });
    setShowForm(true);
  };

  const cancelForm = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setShowForm(false);
  };

  const validate = () => {
    if (!form.code.trim()) {
      toast.error('رمز الموقع الرئيسي مطلوب.');
      return false;
    }

    if (!form.name.trim()) {
      toast.error('اسم الموقع الرئيسي مطلوب.');
      return false;
    }

    const hasLat = form.latitude.trim() !== '';
    const hasLng = form.longitude.trim() !== '';

    if (hasLat !== hasLng) {
      toast.error('أدخل خط العرض وخط الطول معًا، أو اتركهما فارغين.');
      return false;
    }

    if (hasLat && hasLng) {
      const lat = Number(form.latitude);
      const lng = Number(form.longitude);

      if (!Number.isFinite(lat) || lat < -90 || lat > 90) {
        toast.error('خط العرض غير صحيح.');
        return false;
      }

      if (!Number.isFinite(lng) || lng < -180 || lng > 180) {
        toast.error('خط الطول غير صحيح.');
        return false;
      }
    }

    return true;
  };

  const handleSave = async () => {
    if (!validate()) return;

    const payload: Partial<InvestmentSite> = {
      code: normalizeCode(form.code),
      name: form.name.trim(),
      description: form.description.trim() || null,
      deedId: form.deedId || null,
      latitude: form.latitude.trim() ? Number(form.latitude) : null,
      longitude: form.longitude.trim() ? Number(form.longitude) : null,
      region: form.region.trim() || null,
      city: form.city.trim() || null,
      district: form.district.trim() || null,
    };

    try {
      setSaving(true);

      if (editingId) {
        await investmentsApi.updateSite(editingId, payload);
        toast.success('تم تحديث الموقع الاستثماري الرئيسي.');
      } else {
        await investmentsApi.createSite(payload);
        toast.success('تم إنشاء الموقع الاستثماري الرئيسي.');
      }

      cancelForm();
      await loadSites();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'تعذر حفظ الموقع');
    } finally {
      setSaving(false);
    }
  };

  const handleArchive = async (site: InvestmentSite) => {
    const count = site._count?.areas || 0;

    if (count > 0) {
      toast.error('لا يمكن أرشفة موقع رئيسي يحتوي على مساحات نشطة.');
      return;
    }

    if (!window.confirm(`هل تريد أرشفة الموقع "${site.name}"؟`)) return;

    try {
      await investmentsApi.archiveSite(site.id);
      toast.success('تمت أرشفة الموقع.');
      await loadSites();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'تعذر أرشفة الموقع');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <Button variant="ghost" className="mb-2 px-0" onClick={() => navigate('/investments')}>
            <ArrowRight className="me-2 h-4 w-4" />
            المساحات والفرص الاستثمارية
          </Button>
          <h1 className="text-2xl font-bold">المواقع الاستثمارية الرئيسية</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            تسجيل مواقع الجامعة الرئيسية وربط كل موقع بالصك المرجعي قبل إضافة المساحات الاستثمارية التابعة له.
          </p>
        </div>

        {canAdd && (
          <Button onClick={openCreate}>
            <Plus className="me-2 h-4 w-4" />
            إضافة موقع رئيسي
          </Button>
        )}
      </div>

      {showForm && (
        <Card className="border-primary/30">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>
              {editingId ? 'تعديل الموقع الرئيسي' : 'إضافة موقع استثماري رئيسي'}
            </CardTitle>
            <Button variant="ghost" size="icon" onClick={cancelForm}>
              <X className="h-4 w-4" />
            </Button>
          </CardHeader>

          <CardContent className="space-y-5">
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="site-code">رمز الموقع <span className="text-destructive">*</span></Label>
                <Input
                  id="site-code"
                  value={form.code}
                  onChange={(event) => setField('code', normalizeCode(event.target.value))}
                  placeholder="EAST"
                  dir="ltr"
                />
              </div>

              <div className="space-y-2 md:col-span-1 xl:col-span-2">
                <Label htmlFor="site-name">اسم الموقع <span className="text-destructive">*</span></Label>
                <Input
                  id="site-name"
                  value={form.name}
                  onChange={(event) => setField('name', event.target.value)}
                  placeholder="الحرم الجامعي الشرقي"
                />
              </div>

              <div className="space-y-2 md:col-span-2 xl:col-span-3">
                <Label htmlFor="site-deed">الصك المرتبط</Label>
                <NativeSelect
                  id="site-deed"
                  value={form.deedId}
                  onChange={(event) => setField('deedId', event.target.value)}
                  disabled={deedsLoading}
                >
                  <option value="">بدون ربط حاليًا</option>
                  {deeds.map((deed) => (
                    <option key={deed.id} value={deed.id}>
                      {deed.deedNumber} — {deed.propertyDescription}
                    </option>
                  ))}
                </NativeSelect>
              </div>

              {selectedDeed && (
                <div className="md:col-span-2 xl:col-span-3 rounded-2xl border bg-muted/30 p-4">
                  <div className="grid gap-4 md:grid-cols-4">
                    <div>
                      <p className="text-xs text-muted-foreground">رقم الصك</p>
                      <p className="mt-1 font-semibold">{selectedDeed.deedNumber}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">المساحة المسجلة بالصك</p>
                      <p className="mt-1 font-semibold">
                        {Number(selectedDeed.area || 0).toLocaleString('ar-SA')} م²
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">المدينة</p>
                      <p className="mt-1 font-semibold">{selectedDeed.city || '-'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">الحي</p>
                      <p className="mt-1 font-semibold">{selectedDeed.district || '-'}</p>
                    </div>
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="region">المنطقة</Label>
                <Input
                  id="region"
                  value={form.region}
                  onChange={(event) => setField('region', event.target.value)}
                  placeholder="المنطقة الشرقية"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="city">المدينة</Label>
                <Input
                  id="city"
                  value={form.city}
                  onChange={(event) => setField('city', event.target.value)}
                  placeholder="الدمام"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="district">الحي / النطاق</Label>
                <Input
                  id="district"
                  value={form.district}
                  onChange={(event) => setField('district', event.target.value)}
                />
              </div>

              <div className="space-y-2 md:col-span-2 xl:col-span-3">
                <Label htmlFor="description">الوصف</Label>
                <Textarea
                  id="description"
                  value={form.description}
                  onChange={(event) => setField('description', event.target.value)}
                  rows={3}
                  placeholder="وصف مختصر للموقع الرئيسي."
                />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="site-latitude">خط العرض</Label>
                <Input
                  id="site-latitude"
                  type="number"
                  step="0.000001"
                  value={form.latitude}
                  onChange={(event) => setField('latitude', event.target.value)}
                  dir="ltr"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="site-longitude">خط الطول</Label>
                <Input
                  id="site-longitude"
                  type="number"
                  step="0.000001"
                  value={form.longitude}
                  onChange={(event) => setField('longitude', event.target.value)}
                  dir="ltr"
                />
              </div>
            </div>

            <MapCoordinatePicker
              coordinates={coordinateValue}
              onChange={(coordinates) => {
                setField('latitude', String(coordinates.latitude));
                setField('longitude', String(coordinates.longitude));
              }}
            />

            <div className="flex flex-wrap justify-end gap-2">
              <Button variant="outline" onClick={cancelForm} disabled={saving}>
                إلغاء
              </Button>
              <Button onClick={handleSave} disabled={saving}>
                <Save className="me-2 h-4 w-4" />
                {saving ? 'جارٍ الحفظ...' : editingId ? 'حفظ التعديلات' : 'حفظ الموقع'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="pt-6">
          <div className="relative max-w-xl">
            <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="البحث باسم الموقع أو رمزه..."
              className="pr-9"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>الرمز</TableHead>
                <TableHead>الموقع الرئيسي</TableHead>
                <TableHead>الصك المرتبط</TableHead>
                <TableHead>المدينة</TableHead>
                <TableHead>عدد المساحات</TableHead>
                <TableHead className="w-[180px]">الإجراءات</TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {sites.map((site) => (
                <TableRow key={site.id}>
                  <TableCell className="font-semibold" dir="ltr">{site.code}</TableCell>
                  <TableCell>
                    <div className="font-medium">{site.name}</div>
                    {site.latitude != null && site.longitude != null && (
                      <div className="mt-1 flex items-center gap-1 text-xs text-muted-foreground" dir="ltr">
                        <MapPin className="h-3 w-3" />
                        {String(site.latitude)}, {String(site.longitude)}
                      </div>
                    )}
                  </TableCell>
                  <TableCell>{site.deed?.deedNumber || <Badge variant="outline">غير مرتبط</Badge>}</TableCell>
                  <TableCell>{site.city || '-'}</TableCell>
                  <TableCell>{site._count?.areas ?? 0}</TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      {canEdit && (
                        <Button variant="ghost" size="sm" onClick={() => openEdit(site)}>
                          <Edit3 className="me-1 h-4 w-4" />
                          تعديل
                        </Button>
                      )}
                      {canDelete && (
                        <Button variant="ghost" size="sm" onClick={() => handleArchive(site)}>
                          <Trash2 className="me-1 h-4 w-4" />
                          أرشفة
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {loading && (
            <div className="p-10 text-center text-sm text-muted-foreground">
              جارٍ تحميل المواقع...
            </div>
          )}

          {!loading && sites.length === 0 && (
            <div className="p-12 text-center">
              <Building2 className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
              <p className="font-semibold">لا توجد مواقع استثمارية رئيسية</p>
              <p className="mt-1 text-sm text-muted-foreground">
                ابدأ بتسجيل المواقع الرئيسية وربطها بالصكوك قبل إضافة المساحات التابعة لها.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
