import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import {
  Boxes,
  Building2,
  ChevronDown,
  ChevronUp,
  Database,
  Landmark,
  Link2,
  MapPin,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  Trash2,
} from 'lucide-react';
import { toast } from 'sonner';
import { usePermissions } from '../../context/PermissionsContext';
import { mosqueApi, type MosqueBuilding } from '../api/mosques';
import { getAsset, getAssets, updateAsset } from '../api/assets';
import { getAccountingTransformationRecords, updateAccountingTransformationRecord } from '../api/accountingTransformation';
import {
  getAccountingCentralBuildingId,
  getAssetCentralBuildingId,
  isAccountingLinkedToCentralBuilding,
  isAssetLinkedToCentralBuilding,
  normalizeCentralBuildingKey,
  resolveUniqueLegacyBuildingForAccounting,
  resolveUniqueLegacyBuildingForAsset,
  withCentralBuildingId,
} from '../utils/centralBuildingLink';
import type { AssetInput, AssetRecord } from '../../types/asset';
import type { AccountingTransformationRecord } from '../../types/accountingTransformation';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
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

type BuildingForm = {
  buildingNumber: string;
  name: string;
  campusLocation: string;
  city: string;
  district: string;
  latitude: string;
  longitude: string;
};

const EMPTY_FORM: BuildingForm = {
  buildingNumber: '',
  name: '',
  campusLocation: '',
  city: 'الدمام',
  district: '',
  latitude: '',
  longitude: '',
};

const coverageLabels: Record<string, string> = {
  unassessed: 'لم يتم تقييم خدمة الصلاة',
  covered: 'مغطى بخدمة الصلاة',
  needs_prayer_room: 'يحتاج مصلى',
  under_feasibility_study: 'قيد دراسة إنشاء مصلى',
  not_feasible_alternative: 'بديل معتمد',
  under_implementation: 'مصلى تحت التنفيذ',
};

const normalizeKey = normalizeCentralBuildingKey;

const buildingMatchesAsset = (building: MosqueBuilding, asset: AssetRecord, allBuildings: MosqueBuilding[]) =>
  isAssetLinkedToCentralBuilding(building, asset, allBuildings);

const buildingMatchesAccounting = (building: MosqueBuilding, record: AccountingTransformationRecord, allBuildings: MosqueBuilding[]) =>
  isAccountingLinkedToCentralBuilding(building, record, allBuildings);

const linkedPrayerSiteCount = (building: MosqueBuilding) =>
  building._count?.sites ?? building.sites?.length ?? 0;

const GROUP_BATCH_SIZE = 12;

export const CentralBuildingsRegistryPage: React.FC = () => {
  const navigate = useNavigate();
  const { isAdmin, hasPermission } = usePermissions();
  const canView = isAdmin || hasPermission('central_buildings', 'canView');
  const canAdd = isAdmin || hasPermission('central_buildings', 'canAdd');
  const canEdit = isAdmin || hasPermission('central_buildings', 'canEdit');
  const canDelete = isAdmin || hasPermission('central_buildings', 'canDelete');
  const canViewAssets = isAdmin || hasPermission('assets', 'canView');
  const canEditAssets = isAdmin || hasPermission('assets', 'canEdit');
  const canViewAccounting =
    isAdmin || hasPermission('accounting_transformation', 'canView');
  const canEditAccounting =
    isAdmin || hasPermission('accounting_transformation', 'canEdit');

  const [buildings, setBuildings] = useState<MosqueBuilding[]>([]);
  const [assets, setAssets] = useState<AssetRecord[]>([]);
  const [accountingRecords, setAccountingRecords] = useState<
    AccountingTransformationRecord[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [usageLoading, setUsageLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [migrating, setMigrating] = useState(false);
  const [search, setSearch] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [editingBuilding, setEditingBuilding] =
    useState<MosqueBuilding | null>(null);
  const [form, setForm] = useState<BuildingForm>(EMPTY_FORM);
  const [deleteTarget, setDeleteTarget] = useState<MosqueBuilding | null>(null);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [visibleGroupCounts, setVisibleGroupCounts] = useState<Record<string, number>>({});

  const loadData = async () => {
    const shouldShowFullLoader = buildings.length === 0;
    if (shouldShowFullLoader) setLoading(true);
    setUsageLoading(true);

    let buildingLoadSucceeded = false;
    try {
      const buildingResult = await mosqueApi.buildings();
      setBuildings(buildingResult || []);
      buildingLoadSucceeded = true;
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : 'تعذر تحميل السجل المركزي للمباني'
      );
    } finally {
      setLoading(false);
    }

    if (!buildingLoadSucceeded) {
      setUsageLoading(false);
      return;
    }

    try {
      const [assetResult, accountingResult] = await Promise.allSettled([
        canViewAssets ? getAssets() : Promise.resolve([] as AssetRecord[]),
        canViewAccounting
          ? getAccountingTransformationRecords({
              recordType: 'building',
              all: true,
              limit: 5000,
            })
          : Promise.resolve({ items: [] as AccountingTransformationRecord[] }),
      ]);

      setAssets(assetResult.status === 'fulfilled' ? assetResult.value || [] : []);
      setAccountingRecords(
        accountingResult.status === 'fulfilled'
          ? accountingResult.value.items || []
          : []
      );
    } finally {
      setUsageLoading(false);
    }
  };

  useEffect(() => {
    if (canView) void loadData();
  }, [canView, canViewAssets, canViewAccounting]);

  const usage = useMemo(() => {
    const output = new Map<
      string,
      { mosqueSites: number; mosqueProfile: boolean; assets: number; accounting: number }
    >();
    const assetCounts = new Map<string, number>();
    const accountingCounts = new Map<string, number>();

    assets.forEach((asset) => {
      const explicitId = getAssetCentralBuildingId(asset);
      const matchedId = explicitId || resolveUniqueLegacyBuildingForAsset(buildings, asset)?.id || '';
      if (matchedId) assetCounts.set(matchedId, (assetCounts.get(matchedId) || 0) + 1);
    });

    accountingRecords.forEach((record) => {
      const explicitId = getAccountingCentralBuildingId(record);
      const matchedId = explicitId || resolveUniqueLegacyBuildingForAccounting(buildings, record)?.id || '';
      if (matchedId) accountingCounts.set(matchedId, (accountingCounts.get(matchedId) || 0) + 1);
    });

    buildings.forEach((building) => {
      const mosqueSites = linkedPrayerSiteCount(building);
      output.set(building.id, {
        mosqueSites,
        mosqueProfile:
          mosqueSites > 0 ||
          building.coverageStatus !== 'unassessed' ||
          building.expectedUsers != null,
        assets: assetCounts.get(building.id) || 0,
        accounting: accountingCounts.get(building.id) || 0,
      });
    });

    return output;
  }, [accountingRecords, assets, buildings]);

  const filteredBuildings = useMemo(() => {
    const needle = normalizeKey(search);
    if (!needle) return buildings;

    return buildings.filter((building) =>
      [
        building.buildingNumber,
        building.name,
        building.campusLocation,
        building.city,
        building.district,
      ].some((value) => normalizeKey(value).includes(needle))
    );
  }, [buildings, search]);

  const buildingGroups = useMemo(() => {
    const groups = new Map<
      string,
      { key: string; title: string; subtitle: string; buildings: MosqueBuilding[] }
    >();

    filteredBuildings.forEach((building) => {
      const campus = String(building.campusLocation || '').trim();
      const city = String(building.city || '').trim();
      const district = String(building.district || '').trim();
      const title = campus || district || city || 'موقع غير محدد';
      const subtitleParts = [city, district].filter(
        (value, index, values) => value && value !== title && values.indexOf(value) === index
      );
      const subtitle = subtitleParts.join(' — ') || 'لم تحدد بيانات الموقع التفصيلية';
      const key = normalizeKey([campus || '__no_campus__', city || '__no_city__'].join('|')) || 'unassigned';
      const current = groups.get(key) || { key, title, subtitle, buildings: [] };
      current.buildings.push(building);
      groups.set(key, current);
    });

    return Array.from(groups.values())
      .map((group) => ({
        ...group,
        buildings: group.buildings.sort((a, b) =>
          String(a.buildingNumber || '').localeCompare(String(b.buildingNumber || ''), 'ar', { numeric: true })
        ),
      }))
      .sort((a, b) => a.title.localeCompare(b.title, 'ar'));
  }, [filteredBuildings]);

  const toggleGroup = (key: string) => {
    setExpandedGroups((current) => {
      const next = new Set(current);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const showMoreInGroup = (key: string) => {
    setVisibleGroupCounts((current) => ({
      ...current,
      [key]: (current[key] || GROUP_BATCH_SIZE) + GROUP_BATCH_SIZE,
    }));
  };

  const totals = useMemo(() => {
    let mosque = 0;
    let asset = 0;
    let accounting = 0;
    buildings.forEach((building) => {
      const item = usage.get(building.id);
      if (item?.mosqueProfile) mosque += 1;
      if ((item?.assets || 0) > 0) asset += 1;
      if ((item?.accounting || 0) > 0) accounting += 1;
    });
    return { mosque, asset, accounting };
  }, [buildings, usage]);

  const openCreate = () => {
    setEditingBuilding(null);
    setForm(EMPTY_FORM);
    setFormOpen(true);
  };

  const openEdit = (building: MosqueBuilding) => {
    setEditingBuilding(building);
    setForm({
      buildingNumber: building.buildingNumber || '',
      name: building.name || '',
      campusLocation: building.campusLocation || '',
      city: building.city || '',
      district: building.district || '',
      latitude: building.latitude == null ? '' : String(building.latitude),
      longitude: building.longitude == null ? '' : String(building.longitude),
    });
    setFormOpen(true);
  };

  const saveBuilding = async () => {
    const buildingNumber = form.buildingNumber.trim();
    const name = form.name.trim();
    if (!buildingNumber || !name) {
      toast.error('رقم المبنى واسم المبنى حقول مطلوبة');
      return;
    }

    const duplicate = buildings.find(
      (building) =>
        building.id !== editingBuilding?.id &&
        normalizeKey(building.buildingNumber) === normalizeKey(buildingNumber)
    );
    if (duplicate) {
      toast.error(`رقم المبنى مستخدم مسبقًا للمبنى: ${duplicate.name || duplicate.buildingNumber}`);
      return;
    }

    const commonPayload = {
      buildingNumber,
      name,
      campusLocation: form.campusLocation.trim() || null,
      city: form.city.trim() || null,
      district: form.district.trim() || null,
      latitude: safeNumber(form.latitude),
      longitude: safeNumber(form.longitude),
    };

    try {
      setSaving(true);
      if (editingBuilding) {
        await mosqueApi.updateBuilding(editingBuilding.id, commonPayload);
        toast.success('تم تحديث البيانات الأساسية للمبنى في السجل المركزي');
      } else {
        await mosqueApi.createBuilding({
          ...commonPayload,
          coverageStatus: 'unassessed',
          creationFeasibility: 'under_study',
        });
        toast.success('تم تعريف المبنى في السجل المركزي');
      }
      setFormOpen(false);
      await loadData();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'تعذر حفظ بيانات المبنى'
      );
    } finally {
      setSaving(false);
    }
  };

  const migrateLegacyLinks = async () => {
    if (migrating) return;

    let linkedAssets = 0;
    let linkedAccounting = 0;
    let skippedAssets = 0;
    let skippedAccounting = 0;
    let failures = 0;

    try {
      setMigrating(true);

      if (canEditAssets) {
        for (const asset of assets) {
          if (getAssetCentralBuildingId(asset)) continue;
          const matched = resolveUniqueLegacyBuildingForAsset(buildings, asset);
          if (!matched) { skippedAssets += 1; continue; }

          try {
            const fullAsset = await getAsset(asset.id);
            if (getAssetCentralBuildingId(fullAsset)) continue;
            const confirmed = resolveUniqueLegacyBuildingForAsset(buildings, fullAsset);
            if (!confirmed || confirmed.id !== matched.id) { skippedAssets += 1; continue; }

            const editable = { ...fullAsset } as unknown as Record<string, unknown>;
            for (const key of ['id', 'assetNumber', 'custodian', 'createdBy', 'createdAt', 'updatedAt', 'movements', 'inventoryEvents', 'lossCases']) delete editable[key];
            const input = {
              ...editable,
              itemNumber: String(fullAsset.itemNumber || fullAsset.assetNumber || '').trim(),
              name: fullAsset.name,
              category: fullAsset.category,
              excelPayload: withCentralBuildingId(fullAsset.excelPayload, matched.id),
              attachments: fullAsset.attachments || [],
            } as AssetInput;
            if (!input.itemNumber || !input.name || !input.category) { skippedAssets += 1; continue; }
            await updateAsset(fullAsset.id, input);
            linkedAssets += 1;
          } catch {
            failures += 1;
          }
        }
      }

      if (canEditAccounting) {
        for (const record of accountingRecords) {
          if (getAccountingCentralBuildingId(record)) continue;
          const matched = resolveUniqueLegacyBuildingForAccounting(buildings, record);
          if (!matched) { skippedAccounting += 1; continue; }
          try {
            await updateAccountingTransformationRecord(record.id, {
              recordType: record.recordType,
              ownershipMode: record.ownershipMode,
              committeeStatus: record.committeeStatus,
              payload: withCentralBuildingId(record.payload, matched.id),
              attachments: Array.isArray(record.attachments) ? record.attachments : [],
              notes: record.notes || null,
            });
            linkedAccounting += 1;
          } catch {
            failures += 1;
          }
        }
      }

      toast.success(
        `اكتمل ربط السجلات القديمة: ${linkedAssets} أصل، ${linkedAccounting} سجل محاسبي. تم تجاوز ${skippedAssets + skippedAccounting} سجل غير واضح المطابقة.`
      );
      if (failures) toast.warning(`تعذر تحديث ${failures} سجل، ولم يتم تعديل بياناته.`);
      await loadData();
    } finally {
      setMigrating(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    const item = usage.get(deleteTarget.id);
    const references =
      (item?.mosqueSites || 0) + (item?.assets || 0) + (item?.accounting || 0);

    if (references > 0) {
      toast.error('لا يمكن حذف مبنى مرتبط بسجلات تشغيلية. أزل الارتباطات أولًا.');
      setDeleteTarget(null);
      return;
    }

    try {
      setSaving(true);
      await mosqueApi.deleteBuilding(deleteTarget.id);
      toast.success('تم حذف المبنى من السجل المركزي');
      setDeleteTarget(null);
      await loadData();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'تعذر حذف المبنى');
    } finally {
      setSaving(false);
    }
  };

  if (!canView) {
    return (
      <Card className="future-card">
        <CardContent className="p-8 text-center">
          لا تملك صلاحية عرض السجل المركزي للمباني.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="mx-auto w-full max-w-[1780px] space-y-5" dir="rtl">
      <section className="future-card future-glass-thick p-5 md:p-7">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <Badge variant="secondary" className="mb-3 gap-2">
              <Database className="h-4 w-4" />
              المرجع الموحد للمباني
            </Badge>
            <h1 className="flex items-center gap-3 text-3xl font-black">
              <Building2 className="h-8 w-8 text-primary" />
              السجل المركزي للمباني
            </h1>
            <p className="mt-3 max-w-4xl leading-7 text-muted-foreground">
              يُعرّف المبنى مرة واحدة هنا برقم موحد واسم وموقع وخصائص أساسية، ثم
              تستخدمه وحدة العناية بالمساجد والمصليات ووحدة الأصول ولجنة متابعة
              متطلبات التحول المحاسبي دون تكرار تعريف المبنى. الروابط الجديدة تحفظ بمعرف ثابت، ويمكن ترحيل السجلات القديمة ذات المطابقة الواضحة من زر الربط.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => void loadData()} disabled={loading}>
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              تحديث
            </Button>
            {canEdit && (canEditAssets || canEditAccounting) && (
              <Button variant="outline" onClick={() => void migrateLegacyLinks()} disabled={migrating || loading}>
                <Link2 className={`h-4 w-4 ${migrating ? 'animate-pulse' : ''}`} />
                {migrating ? 'جاري ربط السجلات...' : 'ربط السجلات القديمة'}
              </Button>
            )}
            {canAdd && (
              <Button onClick={openCreate}>
                <Plus className="h-4 w-4" />
                إضافة مبنى مركزي
              </Button>
            )}
          </div>
        </div>
      </section>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard icon={Building2} label="إجمالي المباني" value={buildings.length} />
        <StatCard icon={Landmark} label="العناية بالمساجد" value={usageLoading ? '…' : totals.mosque} />
        <StatCard icon={Boxes} label="وحدة الأصول" value={usageLoading ? '…' : totals.asset} />
        <StatCard icon={ShieldCheck} label="التحول المحاسبي" value={usageLoading ? '…' : totals.accounting} />
      </div>

      <Card className="future-card">
        <CardHeader>
          <CardTitle>نطاق البيانات والمسؤولية</CardTitle>
          <CardDescription>
            البيانات الأساسية تعدل من السجل المركزي؛ أما بيانات كل اختصاص فتظل داخل ملف الوحدة المرتبط بالمبنى.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 lg:grid-cols-3">
            <ModuleButton
              icon={Landmark}
              title="وحدة العناية بالمساجد والمصليات"
              description="تغطية خدمة الصلاة، المصليات، الزيارات والاحتياج."
              onClick={() => navigate('/mosques')}
            />
            <ModuleButton
              icon={Boxes}
              title="وحدة الأصول"
              description="الأصول والجرد والباركود والعهد والمواقع التشغيلية."
              onClick={() => navigate('/assets')}
            />
            <ModuleButton
              icon={ShieldCheck}
              title="لجنة متابعة متطلبات التحول المحاسبي"
              description="التصنيف والحصر والتقييم والجاهزية المحاسبية."
              onClick={() => navigate('/accounting-transformation')}
            />
          </div>
        </CardContent>
      </Card>

      <Card className="future-card">
        <CardHeader className="gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <CardTitle>المباني المعرفة</CardTitle>
            <CardDescription>
              المباني مجمعة حسب الحرم / الموقع الجامعي، ولا يتم إنشاء بطاقات المجموعة إلا عند فتحها. البحث يفتح النتائج المطابقة مباشرة.
            </CardDescription>
          </div>
          <div className="relative w-full lg:w-[430px]">
            <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="ابحث في السجل المركزي..."
              className="pr-10"
            />
          </div>
        </CardHeader>
        <CardContent>
          {usageLoading && !loading && (
            <div className="mb-4 flex items-center gap-2 rounded-xl border border-sky-200/70 bg-sky-50/60 px-3 py-2 text-xs font-semibold text-sky-800">
              <RefreshCw className="h-3.5 w-3.5 animate-spin" />
              ظهرت بيانات المباني، وجارٍ تحميل مؤشرات الأصول والتحول المحاسبي في الخلفية دون تعطيل الصفحة.
            </div>
          )}
          {loading ? (
            <div className="py-14 text-center text-muted-foreground">
              جارٍ تحميل السجل المركزي...
            </div>
          ) : filteredBuildings.length === 0 ? (
            <div className="rounded-2xl border border-dashed p-10 text-center text-muted-foreground">
              لا توجد مبانٍ مطابقة للبحث.
            </div>
          ) : (
            <div className="space-y-3">
              {buildingGroups.map((group) => {
                const searchActive = Boolean(search.trim());
                const expanded = searchActive || expandedGroups.has(group.key);
                const visibleCount = searchActive
                  ? group.buildings.length
                  : visibleGroupCounts[group.key] || GROUP_BATCH_SIZE;
                const visibleBuildings = group.buildings.slice(0, visibleCount);

                return (
                  <section key={group.key} className="overflow-hidden rounded-2xl border bg-background/45 shadow-sm">
                    <button
                      type="button"
                      onClick={() => !searchActive && toggleGroup(group.key)}
                      className="flex w-full items-center justify-between gap-4 p-4 text-right transition hover:bg-primary/5"
                    >
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-base font-black text-foreground">{group.title}</span>
                          <Badge variant="secondary">{group.buildings.length} مبنى</Badge>
                        </div>
                        <p className="mt-1 truncate text-xs text-muted-foreground">{group.subtitle}</p>
                      </div>
                      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border bg-background/70">
                        {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                      </span>
                    </button>

                    {expanded && (
                      <div className="border-t p-4">
                        <div className="grid gap-4 xl:grid-cols-2 2xl:grid-cols-3">
                          {visibleBuildings.map((building) => {
                            const item = usage.get(building.id);
                            const references =
                              (item?.mosqueSites || 0) +
                              (item?.assets || 0) +
                              (item?.accounting || 0);
                            return (
                              <article
                                key={building.id}
                                className="rounded-2xl border bg-background/60 p-4 shadow-sm"
                              >
                                <div className="flex items-start justify-between gap-3">
                                  <div className="min-w-0">
                                    <div className="flex flex-wrap items-center gap-2">
                                      <Badge variant="outline">مبنى {building.buildingNumber}</Badge>
                                      <Badge variant="secondary">سجل مركزي</Badge>
                                    </div>
                                    <h3 className="mt-3 truncate text-lg font-black">
                                      {building.name || 'بدون مسمى'}
                                    </h3>
                                    <p className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
                                      <MapPin className="h-4 w-4" />
                                      {[building.campusLocation, building.city, building.district]
                                        .filter(Boolean)
                                        .join(' — ') || 'الموقع غير مكتمل'}
                                    </p>
                                  </div>

                                  <div className="flex gap-1">
                                    {canEdit && (
                                      <Button size="icon" variant="outline" onClick={() => openEdit(building)} title="تعديل البيانات الأساسية">
                                        <Pencil className="h-4 w-4" />
                                      </Button>
                                    )}
                                    {canDelete && (
                                      <Button
                                        size="icon"
                                        variant="outline"
                                        disabled={references > 0}
                                        onClick={() => setDeleteTarget(building)}
                                        title={references > 0 ? 'المبنى مرتبط بسجلات ولا يمكن حذفه' : 'حذف المبنى'}
                                      >
                                        <Trash2 className="h-4 w-4" />
                                      </Button>
                                    )}
                                  </div>
                                </div>

                                <div className="mt-4 grid grid-cols-3 gap-2 text-center text-xs">
                                  <UsageBox
                                    label="العناية"
                                    value={item?.mosqueProfile ? Math.max(item.mosqueSites, 1) : 0}
                                    hint={item?.mosqueProfile ? coverageLabels[building.coverageStatus] || 'مرتبط' : 'غير مستخدم'}
                                  />
                                  <UsageBox label="الأصول" value={item?.assets || 0} hint={usageLoading ? 'جاري التحقق...' : 'أصل مرتبط'} />
                                  <UsageBox label="المحاسبي" value={item?.accounting || 0} hint={usageLoading ? 'جاري التحقق...' : 'سجل مرتبط'} />
                                </div>

                                {(building.latitude != null || building.longitude != null) && (
                                  <div className="mt-3 rounded-xl border bg-muted/25 px-3 py-2 text-xs text-muted-foreground">
                                    الإحداثيات: {building.latitude ?? '—'} ، {building.longitude ?? '—'}
                                  </div>
                                )}
                              </article>
                            );
                          })}
                        </div>

                        {!searchActive && visibleCount < group.buildings.length && (
                          <div className="mt-4 flex justify-center">
                            <Button variant="outline" onClick={() => showMoreInGroup(group.key)}>
                              عرض المزيد — متبقي {group.buildings.length - visibleCount} مبنى
                            </Button>
                          </div>
                        )}
                      </div>
                    )}
                  </section>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl" dir="rtl">
          <DialogHeader className="text-right sm:text-right">
            <DialogTitle>
              {editingBuilding ? 'تعديل المبنى المركزي' : 'تعريف مبنى جديد'}
            </DialogTitle>
            <DialogDescription>
              هذه الحقول مشتركة بين جميع الوحدات. بيانات الاختصاص لا تُدخل هنا.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 md:grid-cols-2">
            <Field label="رقم المبنى *">
              <Input
                value={form.buildingNumber}
                onChange={(event) => setForm((prev) => ({ ...prev, buildingNumber: event.target.value }))}
              />
            </Field>
            <Field label="اسم المبنى *">
              <Input
                value={form.name}
                onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
              />
            </Field>
            <Field label="الحرم / الموقع الجامعي">
              <Input
                value={form.campusLocation}
                onChange={(event) => setForm((prev) => ({ ...prev, campusLocation: event.target.value }))}
              />
            </Field>
            <Field label="المدينة">
              <Input
                value={form.city}
                onChange={(event) => setForm((prev) => ({ ...prev, city: event.target.value }))}
              />
            </Field>
            <Field label="الحي">
              <Input
                value={form.district}
                onChange={(event) => setForm((prev) => ({ ...prev, district: event.target.value }))}
              />
            </Field>
            <div className="hidden md:block" />
            <Field label="خط العرض">
              <Input
                dir="ltr"
                inputMode="decimal"
                value={form.latitude}
                onChange={(event) => setForm((prev) => ({ ...prev, latitude: event.target.value }))}
              />
            </Field>
            <Field label="خط الطول">
              <Input
                dir="ltr"
                inputMode="decimal"
                value={form.longitude}
                onChange={(event) => setForm((prev) => ({ ...prev, longitude: event.target.value }))}
              />
            </Field>
          </div>

          <DialogFooter className="gap-2 sm:justify-start">
            <Button variant="outline" onClick={() => setFormOpen(false)} disabled={saving}>
              إلغاء
            </Button>
            <Button onClick={() => void saveBuilding()} disabled={saving}>
              {saving ? 'جارٍ الحفظ...' : 'حفظ المبنى'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={Boolean(deleteTarget)} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader className="text-right sm:text-right">
            <AlertDialogTitle>حذف المبنى من السجل المركزي؟</AlertDialogTitle>
            <AlertDialogDescription>
              سيتم حذف تعريف المبنى فقط إذا لم يكن مرتبطًا بأي سجل تشغيلي.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction onClick={() => void confirmDelete()} disabled={saving}>
              حذف
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

const StatCard = ({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: React.ReactNode;
}) => (
  <Card className="future-card">
    <CardContent className="flex items-center justify-between p-5">
      <div>
        <p className="text-sm text-muted-foreground">{label}</p>
        <p className="mt-2 text-3xl font-black">{value}</p>
      </div>
      <div className="future-stat-icon h-12 w-12 bg-primary/10 text-primary">
        <Icon className="h-6 w-6" />
      </div>
    </CardContent>
  </Card>
);

const ModuleButton = ({
  icon: Icon,
  title,
  description,
  onClick,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  onClick: () => void;
}) => (
  <button
    type="button"
    onClick={onClick}
    className="rounded-2xl border bg-background/55 p-4 text-right transition hover:border-primary/40 hover:bg-primary/5"
  >
    <div className="flex items-start gap-3">
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
        <Icon className="h-5 w-5" />
      </span>
      <span>
        <span className="block font-black">{title}</span>
        <span className="mt-1 block text-sm leading-6 text-muted-foreground">{description}</span>
      </span>
    </div>
  </button>
);

const UsageBox = ({ label, value, hint }: { label: string; value: number; hint: string }) => (
  <div className="rounded-xl border bg-muted/25 p-2">
    <div className="font-black">{value}</div>
    <div className="mt-0.5 font-bold">{label}</div>
    <div className="mt-1 truncate text-[10px] text-muted-foreground" title={hint}>{hint}</div>
  </div>
);

const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div className="space-y-2">
    <Label>{label}</Label>
    {children}
  </div>
);
