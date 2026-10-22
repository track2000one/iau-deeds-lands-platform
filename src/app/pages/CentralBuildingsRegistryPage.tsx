import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import { CircleMarker, MapContainer, TileLayer, useMap, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import {
  Boxes,
  Building2,
  ChevronDown,
  ChevronUp,
  Crosshair,
  Database,
  Eye,
  Landmark,
  Link2,
  MapPin,
  MapPinned,
  Pencil,
  Printer,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  Trash2,
  UserRound,
} from 'lucide-react';
import { toast } from 'sonner';
import { usePermissions } from '../../context/PermissionsContext';
import { mosqueApi, type MosqueBuilding, type MosqueBuildingDeedReference } from '../api/mosques';
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
import { NativeSelect } from '../components/ui/native-select';
import { Textarea } from '../components/ui/textarea';
import { BuildingExcelImportManager, getPendingBuildingImport, isPendingImportedBuilding } from '../components/BuildingExcelImportManager';
import { CentralBuildingsReports } from '../components/CentralBuildingsReports';
import { CentralBuildingPhotos } from '../components/CentralBuildingPhotos';
import type { CentralBuildingPhoto } from '../api/mosques';
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
  deedId: string;
  campusLocation: string;
  region: string;
  city: string;
  district: string;
  buildingType: string;
  primaryUse: string;
  ownershipType: string;
  operationalStatus: 'active' | 'maintenance' | 'under_construction' | 'temporarily_closed' | 'out_of_service';
  constructionYear: string;
  floorsCount: string;
  basementFloorsCount: string;
  landArea: string;
  builtUpArea: string;
  roomsCount: string;
  entrancesCount: string;
  elevatorsCount: string;
  parkingSpaces: string;
  hasAccessibility: '' | 'yes' | 'no';
  latitude: string;
  longitude: string;
  notes: string;
};

const EMPTY_FORM: BuildingForm = {
  buildingNumber: '',
  name: '',
  deedId: '',
  campusLocation: '',
  region: 'المنطقة الشرقية',
  city: 'الدمام',
  district: '',
  buildingType: '',
  primaryUse: '',
  ownershipType: '',
  operationalStatus: 'active',
  constructionYear: '',
  floorsCount: '',
  basementFloorsCount: '',
  landArea: '',
  builtUpArea: '',
  roomsCount: '',
  entrancesCount: '',
  elevatorsCount: '',
  parkingSpaces: '',
  hasAccessibility: '',
  latitude: '',
  longitude: '',
  notes: '',
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
const DEFAULT_MAP_CENTER: [number, number] = [26.4207, 50.0888];

const parseCoordinate = (value: string): number | null => {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : null;
};

const isValidLatitude = (value: number) => value >= -90 && value <= 90;
const isValidLongitude = (value: number) => value >= -180 && value <= 180;

const buildingDetails = (building: MosqueBuilding): Array<[string, string]> => [
  ['رقم المبنى', building.buildingNumber],
  ['اسم المبنى', building.name || '—'],
  ['الحرم / الموقع الجامعي', building.campusLocation || '—'],
  ['المدينة', building.city || '—'],
  ['الحي', building.district || '—'],
  ['رقم الصك', building.deed?.deedNumber || 'غير مرتبط'],
  ['الاستخدام الرئيسي', building.primaryUse || '—'],
  ['نوع المبنى', building.buildingType || '—'],
  ['عدد الأدوار', building.floorsCount == null ? '—' : String(building.floorsCount)],
  ['المساحة المبنية', building.builtUpArea == null ? '—' : `${building.builtUpArea.toLocaleString('ar-SA')} م²`],
  ['الإحداثيات', building.latitude == null || building.longitude == null ? '—' : `${building.latitude} ، ${building.longitude}`],
  ['أنشأ السجل', building.createdByName || (building.createdBy ? 'مستخدم سابق' : 'سجل قديم غير منسوب')],
  ['تاريخ الإنشاء', building.createdAt ? new Date(building.createdAt).toLocaleString('ar-SA') : '—'],
];

const parseOptionalNumber = (value: string): number | null => {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : null;
};

export const CentralBuildingsRegistryPage: React.FC = () => {
  const navigate = useNavigate();
  const { isAdmin, hasPermission, userProfile } = usePermissions();
  const canView = isAdmin || hasPermission('central_buildings', 'canView');
  const canAdd = isAdmin || hasPermission('central_buildings', 'canAdd');
  const canEdit = isAdmin || hasPermission('central_buildings', 'canEdit');
  const canDelete = isAdmin || hasPermission('central_buildings', 'canDelete');
  const canPrint = isAdmin || hasPermission('central_buildings', 'canPrint');
  const ownsBuilding = (building: MosqueBuilding) => isAdmin || Boolean(
    userProfile?.uid && building.createdBy && userProfile.uid === building.createdBy
  );
  const canEditBuilding = (building: MosqueBuilding) => canEdit && ownsBuilding(building);
  const canDeleteBuilding = (building: MosqueBuilding) => canDelete && ownsBuilding(building);
  const canViewAssets = isAdmin || hasPermission('assets', 'canView');
  const canEditAssets = isAdmin || hasPermission('assets', 'canEdit');
  const canViewAccounting =
    isAdmin || hasPermission('accounting_transformation', 'canView');
  const canEditAccounting =
    isAdmin || hasPermission('accounting_transformation', 'canEdit');

  const [buildings, setBuildings] = useState<MosqueBuilding[]>([]);
  const [pendingBuildingTotal, setPendingBuildingTotal] = useState(0);
  const [buildingDeeds, setBuildingDeeds] = useState<MosqueBuildingDeedReference[]>([]);
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
  const [mapPickerOpen, setMapPickerOpen] = useState(false);
  const [locating, setLocating] = useState(false);
  const [editingBuilding, setEditingBuilding] =
    useState<MosqueBuilding | null>(null);
  const [form, setForm] = useState<BuildingForm>(EMPTY_FORM);
  const [deleteTarget, setDeleteTarget] = useState<MosqueBuilding | null>(null);
  const [viewTarget, setViewTarget] = useState<MosqueBuilding | null>(null);
  const updateBuildingPhotos = (buildingId: string, photos: CentralBuildingPhoto[]) => {
    setBuildings((records) => records.map((item) => item.id === buildingId ? { ...item, photos } : item));
    setEditingBuilding((item) => item?.id === buildingId ? { ...item, photos } : item);
    setViewTarget((item) => item?.id === buildingId ? { ...item, photos } : item);
  };

  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [visibleGroupCounts, setVisibleGroupCounts] = useState<Record<string, number>>({});

  const loadData = async () => {
    const shouldShowFullLoader = buildings.length === 0;
    if (shouldShowFullLoader) setLoading(true);
    setUsageLoading(true);

    let buildingLoadSucceeded = false;
    try {
      const [buildingResult, deedResult] = await Promise.all([
        mosqueApi.buildings(),
        mosqueApi.buildingDeeds(),
      ]);
      setBuildings(buildingResult || []);
      setBuildingDeeds(deedResult || []);
      buildingLoadSucceeded = true;
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : 'تعذر تحميل السجل المركزي للمباني والصكوك'
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
      { mosqueSites: number; mosqueProfile: boolean; assets: number; accounting: number; inspections: number }
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
        inspections: building._count?.siteInspections || 0,
      });
    });

    return output;
  }, [accountingRecords, assets, buildings]);

  const approvedBuildings = buildings;

  const filteredBuildings = useMemo(() => {
    const needle = normalizeKey(search);
    if (!needle) return approvedBuildings;

    return approvedBuildings.filter((building) => [
      building.buildingNumber,
      building.name,
      building.deed?.deedNumber,
      building.deed?.propertyDescription,
      building.campusLocation,
      building.region,
      building.city,
      building.district,
      building.buildingType,
      building.primaryUse,
      building.ownershipType,
    ].some((value) => normalizeKey(value).includes(needle)));
  }, [approvedBuildings, search]);

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
    approvedBuildings.forEach((building) => {
      const item = usage.get(building.id);
      if (item?.mosqueProfile) mosque += 1;
      if ((item?.assets || 0) > 0) asset += 1;
      if ((item?.accounting || 0) > 0) accounting += 1;
    });
    return { mosque, asset, accounting };
  }, [approvedBuildings, usage]);

  const openCreate = () => {
    setEditingBuilding(null);
    setForm(EMPTY_FORM);
    setMapPickerOpen(false);
    setFormOpen(true);
  };

  const openEdit = (building: MosqueBuilding) => {
    if (!canEditBuilding(building)) {
      toast.error('لا يمكنك تعديل سجل أنشأه مستخدم آخر');
      return;
    }
    setEditingBuilding(building);
    setForm({
      buildingNumber: building.buildingNumber || '',
      name: building.name || '',
      deedId: building.deedId || building.deed?.id || '',
      campusLocation: building.campusLocation || '',
      region: building.region || '',
      city: building.city || '',
      district: building.district || '',
      buildingType: building.buildingType || '',
      primaryUse: building.primaryUse || '',
      ownershipType: building.ownershipType || '',
      operationalStatus: building.operationalStatus || 'active',
      constructionYear: building.constructionYear == null ? '' : String(building.constructionYear),
      floorsCount: building.floorsCount == null ? '' : String(building.floorsCount),
      basementFloorsCount: building.basementFloorsCount == null ? '' : String(building.basementFloorsCount),
      landArea: building.landArea == null ? '' : String(building.landArea),
      builtUpArea: building.builtUpArea == null ? '' : String(building.builtUpArea),
      roomsCount: building.roomsCount == null ? '' : String(building.roomsCount),
      entrancesCount: building.entrancesCount == null ? '' : String(building.entrancesCount),
      elevatorsCount: building.elevatorsCount == null ? '' : String(building.elevatorsCount),
      parkingSpaces: building.parkingSpaces == null ? '' : String(building.parkingSpaces),
      hasAccessibility: building.hasAccessibility == null ? '' : building.hasAccessibility ? 'yes' : 'no',
      latitude: building.latitude == null ? '' : String(building.latitude),
      longitude: building.longitude == null ? '' : String(building.longitude),
      notes: building.notes || '',
    });
    setMapPickerOpen(false);
    setFormOpen(true);
  };

  const selectedDeed = useMemo(
    () => buildingDeeds.find((deed) => deed.id === form.deedId) || null,
    [buildingDeeds, form.deedId],
  );

  const applyDeedLocation = (deedId: string) => {
    const deed = buildingDeeds.find((item) => item.id === deedId);
    setForm((previous) => ({
      ...previous,
      deedId,
      region: deed?.region || previous.region,
      city: deed?.city || previous.city,
      district: deed?.district || previous.district,
    }));
  };

  const mapPosition = useMemo<[number, number] | null>(() => {
    const latitude = parseCoordinate(form.latitude);
    const longitude = parseCoordinate(form.longitude);
    if (latitude == null || longitude == null) return null;
    if (!isValidLatitude(latitude) || !isValidLongitude(longitude)) return null;
    return [latitude, longitude];
  }, [form.latitude, form.longitude]);

  const selectMapPosition = (latitude: number, longitude: number) => {
    setForm((prev) => ({
      ...prev,
      latitude: latitude.toFixed(6),
      longitude: longitude.toFixed(6),
    }));
  };

  const useCurrentLocation = () => {
    if (!navigator.geolocation) {
      toast.error('المتصفح لا يدعم تحديد الموقع الحالي');
      return;
    }

    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        selectMapPosition(position.coords.latitude, position.coords.longitude);
        setMapPickerOpen(true);
        setLocating(false);
        toast.success('تم تحديد موقعك الحالي على الخريطة');
      },
      () => {
        setLocating(false);
        toast.error('تعذر الحصول على الموقع الحالي. تحقق من سماح المتصفح بالوصول للموقع.');
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 60000 }
    );
  };

  const saveBuilding = async () => {
    if (editingBuilding && !canEditBuilding(editingBuilding)) {
      toast.error('لا يمكنك تعديل سجل أنشأه مستخدم آخر');
      return;
    }
    if (!editingBuilding && !canAdd) {
      toast.error('لا تملك صلاحية إضافة مبنى');
      return;
    }
    const buildingNumber = form.buildingNumber.trim();
    const name = form.name.trim();
    if (!buildingNumber || !name) {
      toast.error('رقم المبنى واسم المبنى حقول مطلوبة');
      return;
    }
    if (!form.deedId) {
      toast.error('اختيار رقم الصك إلزامي لكل مبنى في السجل المركزي');
      return;
    }

    const latitude = parseCoordinate(form.latitude);
    const longitude = parseCoordinate(form.longitude);
    if (form.latitude.trim() && (latitude == null || !isValidLatitude(latitude))) {
      toast.error('خط العرض غير صحيح. يجب أن يكون بين -90 و 90.');
      return;
    }
    if (form.longitude.trim() && (longitude == null || !isValidLongitude(longitude))) {
      toast.error('خط الطول غير صحيح. يجب أن يكون بين -180 و 180.');
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

    const numericFields = {
      constructionYear: parseOptionalNumber(form.constructionYear),
      floorsCount: parseOptionalNumber(form.floorsCount),
      basementFloorsCount: parseOptionalNumber(form.basementFloorsCount),
      landArea: parseOptionalNumber(form.landArea),
      builtUpArea: parseOptionalNumber(form.builtUpArea),
      roomsCount: parseOptionalNumber(form.roomsCount),
      entrancesCount: parseOptionalNumber(form.entrancesCount),
      elevatorsCount: parseOptionalNumber(form.elevatorsCount),
      parkingSpaces: parseOptionalNumber(form.parkingSpaces),
    };
    const invalidNumeric = Object.entries({
      'سنة الإنشاء': [form.constructionYear, numericFields.constructionYear],
      'عدد الأدوار': [form.floorsCount, numericFields.floorsCount],
      'أدوار القبو': [form.basementFloorsCount, numericFields.basementFloorsCount],
      'مساحة الأرض': [form.landArea, numericFields.landArea],
      'المساحة المبنية': [form.builtUpArea, numericFields.builtUpArea],
      'عدد الغرف': [form.roomsCount, numericFields.roomsCount],
      'عدد المداخل': [form.entrancesCount, numericFields.entrancesCount],
      'عدد المصاعد': [form.elevatorsCount, numericFields.elevatorsCount],
      'مواقف السيارات': [form.parkingSpaces, numericFields.parkingSpaces],
    }).find(([, value]) => String(value[0] || '').trim() && (value[1] == null || Number(value[1]) < 0));
    if (invalidNumeric) {
      toast.error(`قيمة ${invalidNumeric[0]} غير صحيحة`);
      return;
    }

    const commonPayload = {
      buildingNumber,
      name,
      deedId: form.deedId,
      campusLocation: form.campusLocation.trim() || null,
      region: form.region.trim() || null,
      city: form.city.trim() || null,
      district: form.district.trim() || null,
      buildingType: form.buildingType || null,
      primaryUse: form.primaryUse.trim() || null,
      ownershipType: form.ownershipType || null,
      operationalStatus: form.operationalStatus,
      constructionYear: numericFields.constructionYear,
      floorsCount: numericFields.floorsCount,
      basementFloorsCount: numericFields.basementFloorsCount,
      landArea: numericFields.landArea,
      builtUpArea: numericFields.builtUpArea,
      roomsCount: numericFields.roomsCount,
      entrancesCount: numericFields.entrancesCount,
      elevatorsCount: numericFields.elevatorsCount,
      parkingSpaces: numericFields.parkingSpaces,
      hasAccessibility: form.hasAccessibility === '' ? null : form.hasAccessibility === 'yes',
      latitude,
      longitude,
      notes: form.notes.trim() || null,
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
    if (!canDeleteBuilding(deleteTarget)) {
      toast.error('لا يمكنك حذف سجل أنشأه مستخدم آخر');
      setDeleteTarget(null);
      return;
    }
    const item = usage.get(deleteTarget.id);
    const references =
      (item?.mosqueSites || 0) + (item?.assets || 0) + (item?.accounting || 0) + (item?.inspections || 0);

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

  const printBuilding = (building: MosqueBuilding) => {
    if (!canPrint) {
      toast.error('لا تملك صلاحية الطباعة');
      return;
    }
    const popup = window.open('', '_blank', 'width=900,height=750');
    if (!popup) {
      toast.error('يرجى السماح بالنوافذ المنبثقة لطباعة البطاقة');
      return;
    }
    const page = popup.document;
    page.title = `بطاقة مبنى - ${building.buildingNumber}`;
    page.documentElement.lang = 'ar';
    page.documentElement.dir = 'rtl';
    page.body.style.cssText = 'direction:rtl;font-family:Tahoma,Arial,sans-serif;color:#132744;padding:34px;line-height:1.8';
    const heading = page.createElement('h1');
    heading.textContent = 'جامعة الإمام عبدالرحمن بن فيصل — السجل المركزي للمباني';
    heading.style.cssText = 'font-size:22px;border-bottom:2px solid #14365a;padding-bottom:12px';
    page.body.appendChild(heading);
    const heading2 = page.createElement('h2');
    heading2.textContent = building.name || building.buildingNumber;
    page.body.appendChild(heading2);
    const table = page.createElement('table');
    table.style.cssText = 'width:100%;border-collapse:collapse;table-layout:fixed';
    buildingDetails(building).forEach(([label, value]) => {
      const tr = page.createElement('tr');
      const th = page.createElement('th');
      const td = page.createElement('td');
      th.textContent = label;
      td.textContent = value;
      th.style.cssText = 'text-align:right;width:34%;background:#edf2f7;border:1px solid #b6c6d7;padding:9px';
      td.style.cssText = 'border:1px solid #b6c6d7;padding:9px;overflow-wrap:anywhere';
      tr.append(th, td);
      table.appendChild(tr);
    });
    page.body.appendChild(table);
    popup.setTimeout(() => { popup.focus(); popup.print(); }, 250);
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
            {canPrint && <CentralBuildingsReports buildings={buildings} usage={usage} usageLoading={usageLoading} />}
            <Button variant="outline" onClick={() => void loadData()} disabled={loading}>
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              تحديث
            </Button>
            {isAdmin && canEdit && (canEditAssets || canEditAccounting) && (
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

      <BuildingExcelImportManager
        buildings={buildings}
        role="head"
        canAdd={canAdd}
        canEdit={canEdit}
        canDelete={canDelete}
        onReload={loadData}
        onPendingTotalChange={setPendingBuildingTotal}
        context="central"
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-6">
        <StatCard icon={Database} label="إجمالي السجلات" value={buildings.length + pendingBuildingTotal} />
        <StatCard icon={Building2} label="مباني معتمدة" value={approvedBuildings.length} />
        <StatCard icon={RefreshCw} label="معلق للمراجعة" value={pendingBuildingTotal} />
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
                            const pendingEnvelope = getPendingBuildingImport(building);
                            const displayNumber = pendingEnvelope?.draft.buildingNumber || building.buildingNumber;
                            const displayName = pendingEnvelope?.draft.name || building.name;
                            const displayCampus = pendingEnvelope?.draft.campusLocation || building.campusLocation;
                            const displayCity = pendingEnvelope?.draft.city || building.city;
                            const displayDistrict = pendingEnvelope?.draft.district || building.district;
                            const references =
                              (item?.mosqueSites || 0) +
                              (item?.assets || 0) +
                              (item?.accounting || 0) +
                              (item?.inspections || 0);
                            return (
                              <article
                                key={building.id}
                                className="group rounded-2xl border bg-background/60 p-4 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-lg"
                              >
                                <div className="flex items-start justify-between gap-3">
                                  <div className="min-w-0">
                                    <div className="flex flex-wrap items-center gap-2">
                                      <Badge variant="outline">مبنى {displayNumber || 'غير مدخل'}</Badge>
                                      {pendingEnvelope ? <Badge variant="outline" className="border-amber-300 bg-amber-50 text-amber-800">معلق — يحتاج اعتماد</Badge> : <Badge variant="secondary">سجل مركزي معتمد</Badge>}
                                    </div>
                                    <h3 className="mt-3 truncate text-lg font-black">
                                      {displayName || 'بدون مسمى'}
                                    </h3>
                                    <p className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
                                      <MapPin className="h-4 w-4" />
                                      {[displayCampus, displayCity, displayDistrict]
                                        .filter(Boolean)
                                        .join(' — ') || 'الموقع غير مكتمل'}
                                    </p>
                                    <div className="mt-2">
                                      {building.deed ? (
                                        <Badge variant="outline" className="border-emerald-300 bg-emerald-50 text-emerald-800">
                                          صك رقم {building.deed.deedNumber}
                                        </Badge>
                                      ) : !pendingEnvelope ? (
                                        <Badge variant="outline" className="border-red-300 bg-red-50 text-red-700">
                                          غير مرتبط بصك — يلزم الاستكمال
                                        </Badge>
                                      ) : null}
                                    </div>
                                  </div>

                                  <div className="flex shrink-0 items-center gap-1 text-xs text-muted-foreground" title="يحتفظ النظام ببيانات منشئ السجل">
                                    <UserRound className="h-3.5 w-3.5" />
                                    <span className="max-w-[100px] truncate">{building.createdByName || (building.createdBy ? 'مستخدم سابق' : 'سجل قديم')}</span>
                                  </div>
                                </div>

                                <div className="mt-4 grid grid-cols-2 gap-2 text-center text-xs sm:grid-cols-4">
                                  <UsageBox
                                    label="العناية"
                                    value={item?.mosqueProfile ? Math.max(item.mosqueSites, 1) : 0}
                                    hint={item?.mosqueProfile ? coverageLabels[building.coverageStatus] || 'مرتبط' : 'غير مستخدم'}
                                  />
                                  <UsageBox label="الأصول" value={item?.assets || 0} hint={usageLoading ? 'جاري التحقق...' : 'أصل مرتبط'} />
                                  <UsageBox label="المحاسبي" value={item?.accounting || 0} hint={usageLoading ? 'جاري التحقق...' : 'سجل مرتبط'} />
                                  <UsageBox label="المعاينات" value={item?.inspections || 0} hint="معاينة ميدانية" />
                                </div>

                                {(building.floorsCount != null || building.builtUpArea != null || building.primaryUse) && (
                                  <div className="mt-3 flex flex-wrap gap-2 text-[11px]">
                                    {building.floorsCount != null && <Badge variant="outline">الأدوار: {building.floorsCount}</Badge>}
                                    {building.builtUpArea != null && <Badge variant="outline">المساحة المبنية: {building.builtUpArea.toLocaleString('ar-SA')} م²</Badge>}
                                    {building.primaryUse && <Badge variant="outline">{building.primaryUse}</Badge>}
                                  </div>
                                )}

                                {(building.latitude != null || building.longitude != null) && (
                                  <div className="mt-3 rounded-xl border bg-muted/25 px-3 py-2 text-xs text-muted-foreground">
                                    الإحداثيات: {building.latitude ?? '—'} ، {building.longitude ?? '—'}
                                  </div>
                                )}
                                <div className="mt-4 flex flex-wrap gap-2 border-t pt-3">
                                  <Button size="sm" variant="outline" className="gap-1.5 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md" onClick={() => setViewTarget(building)}>
                                    <Eye className="h-4 w-4" /> عرض
                                  </Button>
                                  {canEditBuilding(building) && !pendingEnvelope && (
                                    <Button size="sm" variant="outline" className="gap-1.5 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md" onClick={() => openEdit(building)}>
                                      <Pencil className="h-4 w-4" /> تعديل
                                    </Button>
                                  )}
                                  {canPrint && (
                                    <Button size="sm" variant="outline" className="gap-1.5 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md" onClick={() => printBuilding(building)}>
                                      <Printer className="h-4 w-4" /> طباعة
                                    </Button>
                                  )}
                                  {canDeleteBuilding(building) && (
                                    <Button size="sm" variant="outline" disabled={references > 0}
                                      className="gap-1.5 border-red-300 text-red-700 shadow-sm transition-all hover:-translate-y-0.5 hover:bg-red-50 hover:shadow-md"
                                      onClick={() => setDeleteTarget(building)}
                                      title={references > 0 ? 'المبنى مرتبط بسجلات ولا يمكن حذفه' : 'حذف المبنى'}>
                                      <Trash2 className="h-4 w-4" /> حذف
                                    </Button>
                                  )}
                                  {!ownsBuilding(building) && (
                                    <span className="inline-flex items-center text-xs text-muted-foreground">التعديل والحذف متاحان للمنشئ فقط</span>
                                  )}
                                </div>
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

      <Dialog open={Boolean(viewTarget)} onOpenChange={(open) => !open && setViewTarget(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl" dir="rtl">
          <DialogHeader className="text-right sm:text-right">
            <DialogTitle>عرض بيانات المبنى</DialogTitle>
            <DialogDescription>البيانات الأساسية وبيانات المنشئ كما هي مسجلة في السجل المركزي.</DialogDescription>
          </DialogHeader>
          {viewTarget && (
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {buildingDetails(viewTarget).map(([label, value]) => (
                <div key={label} className="rounded-xl border bg-muted/20 p-3">
                  <p className="text-xs font-semibold text-muted-foreground">{label}</p>
                  <p className="mt-1 break-words text-sm font-bold text-foreground">{value}</p>
                </div>
              ))}
            </div>
          )}
          {viewTarget && (
            <CentralBuildingPhotos key={viewTarget.id} buildingId={viewTarget.id} photos={viewTarget.photos} />
          )}
          <DialogFooter className="gap-2 sm:justify-start">
            {viewTarget && canPrint && <Button variant="outline" onClick={() => printBuilding(viewTarget)}><Printer className="h-4 w-4" /> طباعة البطاقة</Button>}
            <Button variant="outline" onClick={() => setViewTarget(null)}>إغلاق</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-4xl" dir="rtl">
          <DialogHeader className="text-right sm:text-right">
            <DialogTitle>
              {editingBuilding ? 'تعديل المبنى المركزي' : 'تعريف مبنى جديد'}
            </DialogTitle>
            <DialogDescription>
              كل مبنى يجب ربطه بصك مسجل في سجل الصكوك؛ ويمكن أن يرتبط الصك الواحد بأكثر من مبنى.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="md:col-span-2 border-b pb-2">
              <p className="font-black text-foreground">التعريف والموقع</p>
              <p className="mt-1 text-xs text-muted-foreground">البيانات المرجعية الأساسية للمبنى.</p>
            </div>
            <Field label="رقم المبنى *">
              <Input value={form.buildingNumber} onChange={(event) => setForm((prev) => ({ ...prev, buildingNumber: event.target.value }))} />
            </Field>
            <Field label="اسم المبنى *">
              <Input value={form.name} onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))} />
            </Field>
            <div className="md:col-span-2">
              <Field label="رقم الصك المرتبط بالمبنى *">
                <NativeSelect value={form.deedId} onChange={(event) => applyDeedLocation(event.target.value)}>
                  <option value="">اختر الصك من سجل الصكوك...</option>
                  {buildingDeeds.map((deed) => (
                    <option key={deed.id} value={deed.id}>
                      {deed.deedNumber} — {deed.propertyDescription || 'بدون وصف'}{deed.city ? ` — ${deed.city}` : ''}
                    </option>
                  ))}
                </NativeSelect>
              </Field>
              {selectedDeed && (
                <div className="mt-2 rounded-xl border border-emerald-200 bg-emerald-50/60 px-3 py-2 text-xs leading-6 text-emerald-900">
                  مرتبط بالصك رقم <b>{selectedDeed.deedNumber}</b>
                  {selectedDeed.plotNumber ? <> · القطعة: <b>{selectedDeed.plotNumber}</b></> : null}
                  {selectedDeed.planNumber ? <> · المخطط: <b>{selectedDeed.planNumber}</b></> : null}
                  {selectedDeed.area != null ? <> · مساحة الصك: <b>{selectedDeed.area.toLocaleString('ar-SA')} م²</b></> : null}
                </div>
              )}
            </div>
            <Field label="الحرم / الموقع الجامعي">
              <Input value={form.campusLocation} onChange={(event) => setForm((prev) => ({ ...prev, campusLocation: event.target.value }))} />
            </Field>
            <Field label="المنطقة">
              <Input value={form.region} onChange={(event) => setForm((prev) => ({ ...prev, region: event.target.value }))} />
            </Field>
            <Field label="المدينة">
              <Input value={form.city} onChange={(event) => setForm((prev) => ({ ...prev, city: event.target.value }))} />
            </Field>
            <Field label="الحي">
              <Input value={form.district} onChange={(event) => setForm((prev) => ({ ...prev, district: event.target.value }))} />
            </Field>

            <div className="md:col-span-2 mt-2 border-b pb-2">
              <p className="font-black text-foreground">التصنيف والحالة</p>
              <p className="mt-1 text-xs text-muted-foreground">نوع المبنى واستخدامه ووضعه التشغيلي والملكية.</p>
            </div>
            <Field label="نوع المبنى">
              <NativeSelect value={form.buildingType} onChange={(event) => setForm((prev) => ({ ...prev, buildingType: event.target.value }))}>
                <option value="">غير محدد</option>
                <option value="academic">أكاديمي / تعليمي</option>
                <option value="administrative">إداري</option>
                <option value="healthcare">صحي</option>
                <option value="residential">سكني</option>
                <option value="service">خدمات ومرافق</option>
                <option value="warehouse">مستودع</option>
                <option value="parking">مواقف</option>
                <option value="mixed">متعدد الاستخدام</option>
                <option value="other">أخرى</option>
              </NativeSelect>
            </Field>
            <Field label="الاستخدام الرئيسي">
              <Input value={form.primaryUse} onChange={(event) => setForm((prev) => ({ ...prev, primaryUse: event.target.value }))} placeholder="مثال: كلية، إدارة، عيادات، سكن..." />
            </Field>
            <Field label="صفة الإشغال / الملكية">
              <NativeSelect value={form.ownershipType} onChange={(event) => setForm((prev) => ({ ...prev, ownershipType: event.target.value }))}>
                <option value="">غير محدد</option>
                <option value="owned">مملوك للجامعة</option>
                <option value="allocated">مخصص للجامعة</option>
                <option value="leased">مستأجر</option>
                <option value="operated">تحت التشغيل / الإدارة</option>
                <option value="other">أخرى</option>
              </NativeSelect>
            </Field>
            <Field label="الحالة التشغيلية">
              <NativeSelect value={form.operationalStatus} onChange={(event) => setForm((prev) => ({ ...prev, operationalStatus: event.target.value as BuildingForm['operationalStatus'] }))}>
                <option value="active">عامل / مستخدم</option>
                <option value="maintenance">تحت الصيانة</option>
                <option value="under_construction">تحت الإنشاء</option>
                <option value="temporarily_closed">مغلق مؤقتًا</option>
                <option value="out_of_service">خارج الخدمة</option>
              </NativeSelect>
            </Field>
            <Field label="سنة الإنشاء">
              <Input inputMode="numeric" value={form.constructionYear} onChange={(event) => setForm((prev) => ({ ...prev, constructionYear: event.target.value }))} placeholder="مثال: 2018" />
            </Field>
            <Field label="تهيئة الوصول لذوي الإعاقة">
              <NativeSelect value={form.hasAccessibility} onChange={(event) => setForm((prev) => ({ ...prev, hasAccessibility: event.target.value as BuildingForm['hasAccessibility'] }))}>
                <option value="">غير محدد</option>
                <option value="yes">مهيأ</option>
                <option value="no">غير مهيأ</option>
              </NativeSelect>
            </Field>

            <div className="md:col-span-2 mt-2 border-b pb-2">
              <p className="font-black text-foreground">المساحات والتكوين</p>
              <p className="mt-1 text-xs text-muted-foreground">البيانات الكمية اللازمة للحصر وإدارة المبنى والتقارير.</p>
            </div>
            <Field label="عدد الأدوار">
              <Input type="number" min={0} value={form.floorsCount} onChange={(event) => setForm((prev) => ({ ...prev, floorsCount: event.target.value }))} />
            </Field>
            <Field label="عدد أدوار القبو">
              <Input type="number" min={0} value={form.basementFloorsCount} onChange={(event) => setForm((prev) => ({ ...prev, basementFloorsCount: event.target.value }))} />
            </Field>
            <Field label="مساحة الأرض (م²)">
              <Input type="number" min={0} step="0.01" value={form.landArea} onChange={(event) => setForm((prev) => ({ ...prev, landArea: event.target.value }))} />
            </Field>
            <Field label="المساحة المبنية الإجمالية (م²)">
              <Input type="number" min={0} step="0.01" value={form.builtUpArea} onChange={(event) => setForm((prev) => ({ ...prev, builtUpArea: event.target.value }))} />
            </Field>
            <Field label="عدد الغرف / الوحدات">
              <Input type="number" min={0} value={form.roomsCount} onChange={(event) => setForm((prev) => ({ ...prev, roomsCount: event.target.value }))} />
            </Field>
            <Field label="عدد المداخل">
              <Input type="number" min={0} value={form.entrancesCount} onChange={(event) => setForm((prev) => ({ ...prev, entrancesCount: event.target.value }))} />
            </Field>
            <Field label="عدد المصاعد">
              <Input type="number" min={0} value={form.elevatorsCount} onChange={(event) => setForm((prev) => ({ ...prev, elevatorsCount: event.target.value }))} />
            </Field>
            <Field label="عدد مواقف السيارات">
              <Input type="number" min={0} value={form.parkingSpaces} onChange={(event) => setForm((prev) => ({ ...prev, parkingSpaces: event.target.value }))} />
            </Field>
            <div className="md:col-span-2">
              <Field label="ملاحظات عامة عن المبنى">
                <Textarea rows={3} value={form.notes} onChange={(event) => setForm((prev) => ({ ...prev, notes: event.target.value }))} />
              </Field>
            </div>

            <Field label="خط العرض">
              <Input dir="ltr" inputMode="decimal" value={form.latitude} onChange={(event) => setForm((prev) => ({ ...prev, latitude: event.target.value }))} />
            </Field>
            <Field label="خط الطول">
              <Input dir="ltr" inputMode="decimal" value={form.longitude} onChange={(event) => setForm((prev) => ({ ...prev, longitude: event.target.value }))} />
            </Field>

            <div className="md:col-span-2 rounded-2xl border bg-muted/20 p-3">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="flex items-center gap-2 font-black">
                    <MapPinned className="h-4 w-4 text-primary" />
                    تحديد موقع المبنى من الخريطة
                  </div>
                  <p className="mt-1 text-xs leading-5 text-muted-foreground">
                    افتح الخريطة ثم انقر على موقع المبنى؛ يتم تعبئة خط العرض وخط الطول تلقائيًا.
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={useCurrentLocation}
                    disabled={locating}
                  >
                    <Crosshair className={`h-4 w-4 ${locating ? 'animate-pulse' : ''}`} />
                    {locating ? 'جاري التحديد...' : 'موقعي الحالي'}
                  </Button>
                  <Button
                    type="button"
                    variant={mapPickerOpen ? 'secondary' : 'outline'}
                    onClick={() => setMapPickerOpen((value) => !value)}
                  >
                    <MapPinned className="h-4 w-4" />
                    {mapPickerOpen ? 'إخفاء الخريطة' : 'تحديد من الخريطة'}
                  </Button>
                </div>
              </div>

              {mapPickerOpen && (
                <div className="mt-3 overflow-hidden rounded-2xl border bg-background">
                  <div className="border-b bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
                    انقر على الخريطة لتثبيت موقع المبنى. يمكنك التكبير والتحريك للوصول إلى الموقع بدقة.
                  </div>
                  <MapContainer
                    center={mapPosition || DEFAULT_MAP_CENTER}
                    zoom={mapPosition ? 17 : 12}
                    scrollWheelZoom
                    className="h-[340px] w-full"
                    style={{ zIndex: 0 }}
                  >
                    <TileLayer
                      attribution='&copy; OpenStreetMap contributors'
                      url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    />
                    <MapClickSelector onPick={selectMapPosition} />
                    <MapCenterSync position={mapPosition} />
                    {mapPosition && (
                      <CircleMarker
                        center={mapPosition}
                        radius={9}
                        pathOptions={{ color: '#0f766e', fillColor: '#14b8a6', fillOpacity: 0.9, weight: 3 }}
                      />
                    )}
                  </MapContainer>
                  <div className="flex flex-wrap items-center justify-between gap-2 border-t px-3 py-2 text-xs">
                    <span className="text-muted-foreground">
                      {mapPosition
                        ? `الموقع المحدد: ${mapPosition[0].toFixed(6)} ، ${mapPosition[1].toFixed(6)}`
                        : 'لم يتم تحديد موقع بعد'}
                    </span>
                    {mapPosition && (
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={() => setForm((prev) => ({ ...prev, latitude: '', longitude: '' }))}
                      >
                        مسح الموقع
                      </Button>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          <CentralBuildingPhotos
            key={editingBuilding?.id || 'new-building'}
            buildingId={editingBuilding?.id}
            photos={editingBuilding?.photos}
            editable={Boolean(editingBuilding && canEditBuilding(editingBuilding))}
            onPhotosChange={(photos) => {
              if (editingBuilding) updateBuildingPhotos(editingBuilding.id, photos);
            }}
            onReload={loadData}
          />

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

const MapClickSelector = ({ onPick }: { onPick: (latitude: number, longitude: number) => void }) => {
  useMapEvents({
    click(event) {
      onPick(event.latlng.lat, event.latlng.lng);
    },
  });
  return null;
};

const MapCenterSync = ({ position }: { position: [number, number] | null }) => {
  const map = useMap();
  useEffect(() => {
    if (position) map.setView(position, Math.max(map.getZoom(), 16), { animate: true });
  }, [map, position]);
  return null;
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
