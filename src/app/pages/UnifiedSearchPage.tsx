import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import { useTranslation } from 'react-i18next';
import { useData } from '../../context/DataContext';
import { useDeeds } from '../../context/DeedContext';
import { usePermissions } from '../../context/PermissionsContext';
import { Boxes, Building, ClipboardCheck, Eye, FileText, Filter, MapPin, Search, SlidersHorizontal, X } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { NativeSelect } from '../components/ui/native-select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Badge } from '../components/ui/badge';
import type { ModuleName } from '../../types/permissions';
import type { RecordType } from '../../types/models';
import type { SiteInspection } from '../../types/siteInspection';
import type { AssetRecord } from '../../types/asset';
import { ASSET_STATUS_LABELS } from '../../types/asset';
import { getSiteInspections } from '../api/siteInspections';
import { getAssets } from '../api/assets';

type SearchRecord = any & { type: RecordType; typeName: string };
type SearchTypeOption = { value: RecordType | 'all'; label: string; module?: ModuleName };

const TYPE_MODULE_MAP: Partial<Record<RecordType, ModuleName>> = {
  deed: 'deeds', allocated_land: 'allocated_lands', delivered_land: 'delivered_lands',
  leased_land_out: 'leased_lands_out', leased_land_in: 'leased_lands_in', leased_building_out: 'leased_buildings_out',
  leased_building_in: 'leased_buildings_in', site_inspection: 'site_inspections', asset: 'assets',
};

const safeText = (value: unknown) => {
  if (value === null || value === undefined) return '';
  if (typeof value === 'object') {
    try { return JSON.stringify(value); } catch { return ''; }
  }
  return String(value);
};

const getRecordViewPath = (record: SearchRecord) => {
  switch (record.type) {
    case 'deed': return record.id ? `/deeds/${record.id}` : '/deeds';
    case 'allocated_land': return '/lands/allocated';
    case 'delivered_land': return '/lands/delivered';
    case 'leased_land_out': return '/lands/leased-out';
    case 'leased_land_in': return '/lands/leased-in';
    case 'leased_building_out': return '/buildings/leased-out';
    case 'leased_building_in': return '/buildings/leased-in';
    case 'site_inspection': return record.id ? `/site-inspections/${record.id}` : '/site-inspections';
    case 'asset': return record.id ? `/assets/${record.id}` : '/assets/list';
    default: return '/';
  }
};

const identifierFor = (record: SearchRecord) =>
  safeText(record.assetNumber || record.deedNumber || record.inspectionNumber || record.receiptNumber || record.contractNumber || record.buildingNumber || record.plotNumber || record.id || '-');

const basicInfoFor = (record: SearchRecord) =>
  safeText(record.name || record.propertyDescription || record.landName || record.description || record.recipientEntity || record.title || record.siteName || record.tenant?.name || record.owner?.name || record.locationName || '-');

const locationFor = (record: SearchRecord) => {
  if (record.type === 'asset') {
    return [record.department, record.building, record.floor, record.room].filter(Boolean).join(' - ') || '-';
  }
  return [record.region, record.city, record.district, record.location, record.locationName, record.locationDescription].filter(Boolean).join(' - ') || '-';
};

const detailsFor = (record: SearchRecord) => {
  if (record.type === 'asset') {
    const status = ASSET_STATUS_LABELS[record.status as keyof typeof ASSET_STATUS_LABELS] || record.status || '-';
    return `الحالة: ${status} | الباركود: ${record.barcode || '-'} | العهدة: ${record.custodian || '-'}`;
  }
  const area = Number(record.area || 0);
  return area ? `${area.toLocaleString('ar-SA')} م²` : '-';
};

export const UnifiedSearchPage: React.FC = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { deeds } = useDeeds();
  const { hasPermission, isAdmin } = usePermissions();
  const { allocatedLands, deliveredLands, leasedLandsOut, leasedLandsIn, leasedBuildingsOut, leasedBuildingsIn } = useData();
  const [searchQuery, setSearchQuery] = useState('');
  const [recordType, setRecordType] = useState<RecordType | 'all'>('all');
  const [siteInspections, setSiteInspections] = useState<SiteInspection[]>([]);
  const [assets, setAssets] = useState<AssetRecord[]>([]);

  useEffect(() => {
    let cancelled = false;
    if (isAdmin || hasPermission('site_inspections', 'canView')) {
      getSiteInspections().then((items) => !cancelled && setSiteInspections(Array.isArray(items) ? items : [])).catch(() => !cancelled && setSiteInspections([]));
    }
    if (isAdmin || hasPermission('assets', 'canView')) {
      getAssets().then((items) => !cancelled && setAssets(Array.isArray(items) ? items : [])).catch(() => !cancelled && setAssets([]));
    }
    return () => { cancelled = true; };
  }, [isAdmin, hasPermission]);

  const typeOptions = useMemo<SearchTypeOption[]>(() => [
    { value: 'all', label: t('search.allRecords') || 'جميع السجلات' },
    { value: 'deed', label: t('search.deeds') || 'الصكوك', module: 'deeds' },
    { value: 'allocated_land', label: t('search.allocatedLands') || 'الأراضي المخصصة', module: 'allocated_lands' },
    { value: 'delivered_land', label: t('search.deliveredLands') || 'الأراضي المسلمة', module: 'delivered_lands' },
    { value: 'leased_land_out', label: t('search.leasedLandsOut') || 'الأراضي المؤجرة', module: 'leased_lands_out' },
    { value: 'leased_land_in', label: t('search.leasedLandsIn') || 'الأراضي المستأجرة', module: 'leased_lands_in' },
    { value: 'leased_building_out', label: t('search.leasedBuildingsOut') || 'المباني المؤجرة', module: 'leased_buildings_out' },
    { value: 'leased_building_in', label: t('search.leasedBuildingsIn') || 'المباني المستأجرة', module: 'leased_buildings_in' },
    { value: 'site_inspection', label: 'معاينة أرض أو موقع', module: 'site_inspections' },
    { value: 'asset', label: 'الأصول', module: 'assets' },
  ], [t]);

  const visibleTypeOptions = useMemo(() => typeOptions.filter((option) => option.value === 'all' || isAdmin || (option.module && hasPermission(option.module, 'canView'))), [typeOptions, isAdmin, hasPermission]);
  const canViewType = (type: RecordType) => isAdmin || Boolean(TYPE_MODULE_MAP[type] && hasPermission(TYPE_MODULE_MAP[type]!, 'canView'));

  const allRecords = useMemo<SearchRecord[]>(() => {
    const records: SearchRecord[] = [
      ...deeds.map((r) => ({ ...r, type: 'deed' as RecordType, typeName: 'صك' })),
      ...allocatedLands.map((r) => ({ ...r, type: 'allocated_land' as RecordType, typeName: 'أرض مخصصة' })),
      ...deliveredLands.map((r) => ({ ...r, type: 'delivered_land' as RecordType, typeName: 'أرض مسلمة' })),
      ...leasedLandsOut.map((r) => ({ ...r, type: 'leased_land_out' as RecordType, typeName: 'أرض مؤجرة' })),
      ...leasedLandsIn.map((r) => ({ ...r, type: 'leased_land_in' as RecordType, typeName: 'أرض مستأجرة' })),
      ...leasedBuildingsOut.map((r) => ({ ...r, type: 'leased_building_out' as RecordType, typeName: 'مبنى مؤجر' })),
      ...leasedBuildingsIn.map((r) => ({ ...r, type: 'leased_building_in' as RecordType, typeName: 'مبنى مستأجر' })),
      ...siteInspections.map((r) => ({ ...r, type: 'site_inspection' as RecordType, typeName: 'معاينة أرض أو موقع' })),
      ...assets.map((r) => ({ ...r, type: 'asset' as RecordType, typeName: 'أصل' })),
    ];
    return records.filter((record) => canViewType(record.type));
  }, [deeds, allocatedLands, deliveredLands, leasedLandsOut, leasedLandsIn, leasedBuildingsOut, leasedBuildingsIn, siteInspections, assets, isAdmin, hasPermission]);

  const filteredRecords = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return allRecords.filter((record) => {
      if (recordType !== 'all' && record.type !== recordType) return false;
      if (!query) return true;
      const values = [identifierFor(record), basicInfoFor(record), locationFor(record), record.barcode, record.serialNumber, record.brand, record.model, record.custodian, record.department, record.city, record.district, record.plotNumber, record.planNumber, record.contractNumber];
      return values.some((value) => safeText(value).toLowerCase().includes(query));
    });
  }, [allRecords, recordType, searchQuery]);

  const clearFilters = () => { setSearchQuery(''); setRecordType('all'); };

  const iconFor = (type: RecordType) => {
    if (type === 'asset') return <Boxes className="h-4 w-4" />;
    if (type === 'site_inspection') return <ClipboardCheck className="h-4 w-4" />;
    if (type.includes('building')) return <Building className="h-4 w-4" />;
    if (type === 'deed') return <FileText className="h-4 w-4" />;
    return <MapPin className="h-4 w-4" />;
  };

  return (
    <div className="w-full min-w-0 space-y-4 sm:space-y-5">
      <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
        <div><h1 className="text-2xl font-bold md:text-3xl">{t('search.unifiedSearch') || 'البحث الموحد'}</h1><p className="text-sm text-muted-foreground">البحث في الصكوك والأراضي والمباني والمعاينات والأصول.</p></div>
        <Badge variant="outline" className="w-fit px-3 py-1.5 text-sm">{filteredRecords.length} نتيجة</Badge>
      </div>

      <Card className="overflow-hidden">
        <CardHeader className="border-b pb-4"><CardTitle className="flex items-center gap-2 text-lg"><SlidersHorizontal className="h-5 w-5" />البحث والتصفية</CardTitle><CardDescription>ابحث برقم الصك أو رقم الأصل أو الباركود أو الرقم التسلسلي أو الموقع أو العهدة.</CardDescription></CardHeader>
        <CardContent className="grid grid-cols-1 gap-3 p-4 md:grid-cols-[minmax(0,1fr)_320px_auto] md:p-5">
          <div className="relative"><Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pr-10" placeholder="اكتب كلمة البحث..." /></div>
          <NativeSelect value={recordType} onChange={(e) => setRecordType(e.target.value as RecordType | 'all')}>{visibleTypeOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</NativeSelect>
          <Button variant="outline" onClick={clearFilters} disabled={!searchQuery && recordType === 'all'}><X className="ml-2 h-4 w-4" />مسح</Button>
        </CardContent>
      </Card>

      <Card className="overflow-hidden">
        <CardHeader className="border-b"><CardTitle className="flex items-center gap-2"><Filter className="h-5 w-5" />نتائج البحث</CardTitle></CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader><TableRow><TableHead>النوع</TableHead><TableHead>المعرّف</TableHead><TableHead>المعلومات الأساسية</TableHead><TableHead>الموقع</TableHead><TableHead>التفاصيل</TableHead><TableHead>الإجراءات</TableHead></TableRow></TableHeader>
              <TableBody>
                {filteredRecords.length === 0 ? <TableRow><TableCell colSpan={6} className="h-40 text-center text-muted-foreground">لا توجد نتائج مطابقة.</TableCell></TableRow> : filteredRecords.map((record, index) => (
                  <TableRow key={`${record.type}-${record.id || index}`}>
                    <TableCell><Badge variant="outline" className="gap-1">{iconFor(record.type)}{record.typeName}</Badge></TableCell>
                    <TableCell className="font-semibold">{identifierFor(record)}</TableCell>
                    <TableCell>{basicInfoFor(record)}</TableCell>
                    <TableCell>{locationFor(record)}</TableCell>
                    <TableCell>{detailsFor(record)}</TableCell>
                    <TableCell><Button variant="ghost" size="sm" onClick={() => navigate(getRecordViewPath(record))}><Eye className="ml-1 h-4 w-4" />عرض</Button></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
