import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import { useTranslation } from 'react-i18next';
import { useData } from '../../context/DataContext';
import { useDeeds } from '../../context/DeedContext';
import { usePermissions } from '../../context/PermissionsContext';
import {
  Building,
  ExternalLink,
  Eye,
  FileText,
  Filter,
  MapPin,
  Navigation,
  Search,
  SlidersHorizontal,
  X,
} from 'lucide-react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '../components/ui/card';
import { Button } from '../components/ui/button';
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
import { Badge } from '../components/ui/badge';
import type { ModuleName } from '../../types/permissions';
import type { RecordType } from '../../types/models';

type SearchRecord = any & {
  type: RecordType;
  typeName: string;
};

type SafeCoordinates = {
  latitude: number;
  longitude: number;
};

type SearchTypeOption = {
  value: RecordType | 'all';
  label: string;
  module?: ModuleName;
};

const TYPE_MODULE_MAP: Partial<Record<RecordType, ModuleName>> = {
  deed: 'deeds',
  allocated_land: 'allocated_lands',
  delivered_land: 'delivered_lands',
  leased_land_out: 'leased_lands_out',
  leased_land_in: 'leased_lands_in',
  leased_building_out: 'leased_buildings_out',
  leased_building_in: 'leased_buildings_in',
};

const parseCoordinates = (value: unknown): SafeCoordinates | null => {
  if (!value) return null;

  try {
    let raw: any = value;

    if (typeof value === 'string') {
      const trimmed = value.trim();

      if (!trimmed) return null;

      if (trimmed.startsWith('{')) {
        raw = JSON.parse(trimmed);
      } else {
        const parts = trimmed
          .split(',')
          .map((part) => Number(part.trim()));

        if (
          parts.length >= 2 &&
          !Number.isNaN(parts[0]) &&
          !Number.isNaN(parts[1])
        ) {
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
      raw.latitude ?? raw.lat ?? raw.y ?? raw[0]
    );
    const longitude = Number(
      raw.longitude ??
        raw.lng ??
        raw.lon ??
        raw.x ??
        raw[1]
    );

    if (
      Number.isNaN(latitude) ||
      Number.isNaN(longitude)
    ) {
      return null;
    }

    return { latitude, longitude };
  } catch {
    return null;
  }
};

const safeText = (value: unknown): string => {
  if (value === null || value === undefined) return '';

  if (typeof value === 'object') {
    try {
      return JSON.stringify(value);
    } catch {
      return '';
    }
  }

  return String(value);
};

const getRecordViewPath = (record: SearchRecord): string => {
  switch (record.type) {
    case 'deed':
      return record.id ? `/deeds/${record.id}` : '/deeds';
    case 'allocated_land':
      return '/lands/allocated';
    case 'delivered_land':
      return '/lands/delivered';
    case 'leased_land_out':
      return '/lands/leased-out';
    case 'leased_land_in':
      return '/lands/leased-in';
    case 'leased_building_out':
      return '/buildings/leased-out';
    case 'leased_building_in':
      return '/buildings/leased-in';
    default:
      return '/';
  }
};

const getRecordIdentifier = (record: SearchRecord): string =>
  safeText(
    record.deedNumber ||
      record.receiptNumber ||
      record.plotNumber ||
      record.contractNumber ||
      record.buildingNumber ||
      record.recordNumber ||
      record.documentNumber ||
      record.id ||
      '-'
  );

const getRecordBasicInfo = (record: SearchRecord): string =>
  safeText(
    record.propertyDescription ||
      record.landName ||
      record.description ||
      record.recipientEntity ||
      record.tenant?.name ||
      record.tenantName ||
      record.owner?.name ||
      record.ownerName ||
      record.entityName ||
      record.locationName ||
      record.name ||
      '-'
  );

const getRecordArea = (
  record: SearchRecord,
  sqmLabel: string
): string => {
  const area = Number(record.area || 0);

  if (!area || Number.isNaN(area)) return '-';

  return `${area.toLocaleString('ar-SA')} ${sqmLabel}`;
};

const getRecordLocation = (record: SearchRecord): string => {
  const parts = [
    record.region,
    record.city,
    record.district,
    record.location,
    record.locationName,
  ]
    .map((item) => safeText(item).trim())
    .filter(Boolean);

  return [...new Set(parts)].join(' - ') || '-';
};

export const UnifiedSearchPage: React.FC = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { deeds } = useDeeds();
  const { hasPermission, isAdmin } = usePermissions();

  const {
    allocatedLands,
    deliveredLands,
    leasedLandsOut,
    leasedLandsIn,
    leasedBuildingsOut,
    leasedBuildingsIn,
  } = useData();

  const [searchQuery, setSearchQuery] = useState('');
  const [recordType, setRecordType] =
    useState<RecordType | 'all'>('all');

  const typeOptions = useMemo<SearchTypeOption[]>(
    () => [
      { value: 'all', label: t('search.allRecords') },
      {
        value: 'deed',
        label: t('search.deeds'),
        module: 'deeds',
      },
      {
        value: 'allocated_land',
        label: t('search.allocatedLands'),
        module: 'allocated_lands',
      },
      {
        value: 'delivered_land',
        label: t('search.deliveredLands'),
        module: 'delivered_lands',
      },
      {
        value: 'leased_land_out',
        label: t('search.leasedLandsOut'),
        module: 'leased_lands_out',
      },
      {
        value: 'leased_land_in',
        label: t('search.leasedLandsIn'),
        module: 'leased_lands_in',
      },
      {
        value: 'leased_building_out',
        label: t('search.leasedBuildingsOut'),
        module: 'leased_buildings_out',
      },
      {
        value: 'leased_building_in',
        label: t('search.leasedBuildingsIn'),
        module: 'leased_buildings_in',
      },
    ],
    [t]
  );

  const visibleTypeOptions = useMemo(
    () =>
      typeOptions.filter(
        (option) =>
          option.value === 'all' ||
          isAdmin ||
          (option.module &&
            hasPermission(option.module, 'canView'))
      ),
    [typeOptions, isAdmin, hasPermission]
  );

  const canViewType = (type: RecordType): boolean => {
    if (isAdmin) return true;

    const moduleName = TYPE_MODULE_MAP[type];

    return moduleName
      ? hasPermission(moduleName, 'canView')
      : false;
  };

  const allRecords = useMemo<SearchRecord[]>(() => {
    const records: SearchRecord[] = [
      ...deeds.map((record) => ({
        ...record,
        type: 'deed' as RecordType,
        typeName: t('search.deed'),
      })),
      ...allocatedLands.map((record) => ({
        ...record,
        type: 'allocated_land' as RecordType,
        typeName: t('search.allocatedLand'),
      })),
      ...deliveredLands.map((record) => ({
        ...record,
        type: 'delivered_land' as RecordType,
        typeName: t('search.deliveredLand'),
      })),
      ...leasedLandsOut.map((record) => ({
        ...record,
        type: 'leased_land_out' as RecordType,
        typeName: t('search.leasedLandOut'),
      })),
      ...leasedLandsIn.map((record) => ({
        ...record,
        type: 'leased_land_in' as RecordType,
        typeName: t('search.leasedLandIn'),
      })),
      ...leasedBuildingsOut.map((record) => ({
        ...record,
        type: 'leased_building_out' as RecordType,
        typeName: t('search.leasedBuildingOut'),
      })),
      ...leasedBuildingsIn.map((record) => ({
        ...record,
        type: 'leased_building_in' as RecordType,
        typeName: t('search.leasedBuildingIn'),
      })),
    ];

    return records.filter((record) =>
      canViewType(record.type)
    );
  }, [
    deeds,
    allocatedLands,
    deliveredLands,
    leasedLandsOut,
    leasedLandsIn,
    leasedBuildingsOut,
    leasedBuildingsIn,
    t,
    isAdmin,
    hasPermission,
  ]);

  const filteredRecords = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    return allRecords.filter((record) => {
      const matchesType =
        recordType === 'all' ||
        record.type === recordType;

      const searchableValues = [
        getRecordIdentifier(record),
        getRecordBasicInfo(record),
        getRecordLocation(record),
        record.deedNumber,
        record.receiptNumber,
        record.plotNumber,
        record.planNumber,
        record.contractNumber,
        record.buildingNumber,
        record.region,
        record.city,
        record.district,
      ];

      const matchesSearch =
        query === '' ||
        searchableValues.some((value) =>
          safeText(value)
            .toLowerCase()
            .includes(query)
        );

      return matchesType && matchesSearch;
    });
  }, [allRecords, recordType, searchQuery]);

  const hasActiveFilters =
    searchQuery.trim() !== '' ||
    recordType !== 'all';

  const clearFilters = () => {
    setSearchQuery('');
    setRecordType('all');
  };

  const getRecordIcon = (type: RecordType) => {
    switch (type) {
      case 'deed':
        return <FileText className="h-4 w-4" />;
      case 'allocated_land':
      case 'delivered_land':
      case 'leased_land_out':
      case 'leased_land_in':
        return <MapPin className="h-4 w-4" />;
      case 'leased_building_out':
      case 'leased_building_in':
        return <Building className="h-4 w-4" />;
      default:
        return <FileText className="h-4 w-4" />;
    }
  };

  const handleViewRecord = (record: SearchRecord) => {
    navigate(getRecordViewPath(record));
  };

  const handleOpenLocation = (record: SearchRecord) => {
    const coordinates = parseCoordinates(
      record.coordinates
    );

    if (!coordinates) return;

    window.open(
      `https://www.google.com/maps?q=${coordinates.latitude},${coordinates.longitude}`,
      '_blank',
      'noopener,noreferrer'
    );
  };

  return (
    <div className="w-full space-y-5">
      <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-2xl font-bold md:text-3xl">
            {t('search.unifiedSearch')}
          </h1>
          <p className="text-sm text-muted-foreground">
            {t('search.searchAllRecords')}
          </p>
        </div>

        <Badge
          variant="outline"
          className="w-fit px-3 py-1.5 text-sm"
        >
          {filteredRecords.length} نتيجة
        </Badge>
      </div>

      <Card className="overflow-hidden">
        <CardHeader className="border-b pb-4">
          <CardTitle className="flex items-center gap-2 text-lg">
            <SlidersHorizontal className="h-5 w-5" />
            البحث والتصفية
          </CardTitle>
          <CardDescription>
            ابحث برقم الصك أو المحضر أو القطعة أو المخطط
            أو المدينة أو اسم الموقع.
          </CardDescription>
        </CardHeader>

        <CardContent className="p-4 md:p-5">
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(220px,0.8fr)_minmax(320px,2fr)_auto] lg:items-end">
            <div className="space-y-2">
              <Label htmlFor="recordType">
                نوع السجل
              </Label>

              <NativeSelect
                id="recordType"
                value={recordType}
                onChange={(event) =>
                  setRecordType(
                    event.target.value as
                      | RecordType
                      | 'all'
                  )
                }
              >
                {visibleTypeOptions.map((option) => (
                  <option
                    key={option.value}
                    value={option.value}
                  >
                    {option.label}
                  </option>
                ))}
              </NativeSelect>
            </div>

            <div className="space-y-2">
              <Label htmlFor="searchQuery">
                كلمة البحث
              </Label>

              <div className="relative">
                <Search className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />

                <Input
                  id="searchQuery"
                  value={searchQuery}
                  onChange={(event) =>
                    setSearchQuery(event.target.value)
                  }
                  placeholder="ابحث برقم صك، مدينة، حي، قطعة، مخطط أو اسم موقع..."
                  className="pr-10"
                />
              </div>
            </div>

            <Button
              type="button"
              variant="outline"
              onClick={clearFilters}
              disabled={!hasActiveFilters}
              className="gap-2"
            >
              <X className="h-4 w-4" />
              مسح التصفية
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="overflow-hidden">
        <CardHeader className="border-b pb-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Filter className="h-5 w-5" />
                نتائج البحث
              </CardTitle>
              <CardDescription>
                {hasActiveFilters
                  ? `تم العثور على ${filteredRecords.length} نتيجة مطابقة`
                  : `عرض جميع السجلات المتاحة (${filteredRecords.length})`}
              </CardDescription>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {filteredRecords.length === 0 ? (
            <div className="flex min-h-64 flex-col items-center justify-center gap-3 p-8 text-center">
              <div className="rounded-full border bg-muted/40 p-4">
                <Search className="h-7 w-7 text-muted-foreground" />
              </div>

              <div>
                <p className="font-semibold">
                  لا توجد نتائج مطابقة
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  جرّب تغيير نوع السجل أو استخدام كلمة
                  بحث مختلفة.
                </p>
              </div>

              {hasActiveFilters && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={clearFilters}
                >
                  عرض جميع السجلات
                </Button>
              )}
            </div>
          ) : (
            <>
              <div className="hidden overflow-x-auto lg:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>النوع</TableHead>
                      <TableHead>المعرّف</TableHead>
                      <TableHead>
                        المعلومات الأساسية
                      </TableHead>
                      <TableHead>المساحة</TableHead>
                      <TableHead>الموقع</TableHead>
                      <TableHead className="text-center">
                        الإجراءات
                      </TableHead>
                    </TableRow>
                  </TableHeader>

                  <TableBody>
                    {filteredRecords.map((record) => {
                      const coordinates =
                        parseCoordinates(
                          record.coordinates
                        );
                      const isDeed =
                        record.type === 'deed';

                      return (
                        <TableRow
                          key={`${record.type}-${record.id}`}
                          className="hover:bg-muted/30"
                        >
                          <TableCell>
                            <div className="flex items-center gap-2">
                              {getRecordIcon(record.type)}
                              <Badge variant="outline">
                                {record.typeName}
                              </Badge>
                            </div>
                          </TableCell>

                          <TableCell className="font-mono text-sm font-medium">
                            {getRecordIdentifier(record)}
                          </TableCell>

                          <TableCell className="max-w-[280px]">
                            <p className="line-clamp-2">
                              {getRecordBasicInfo(record)}
                            </p>
                          </TableCell>

                          <TableCell className="whitespace-nowrap">
                            {getRecordArea(
                              record,
                              t('deed.sqm')
                            )}
                          </TableCell>

                          <TableCell className="max-w-[360px]">
                            <p className="line-clamp-2">
                              {getRecordLocation(record)}
                            </p>
                          </TableCell>

                          <TableCell>
                            <div className="flex items-center justify-center gap-1">
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                onClick={() =>
                                  handleViewRecord(record)
                                }
                                title={
                                  isDeed
                                    ? 'عرض الصك'
                                    : 'فتح القسم'
                                }
                              >
                                <Eye className="h-4 w-4" />
                              </Button>

                              {coordinates && (
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  onClick={() =>
                                    handleOpenLocation(
                                      record
                                    )
                                  }
                                  title="عرض الموقع"
                                >
                                  <Navigation className="h-4 w-4" />
                                </Button>
                              )}

                              {isDeed && record.id && (
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  onClick={() =>
                                    window.open(
                                      `/#/deeds/${record.id}`,
                                      '_blank'
                                    )
                                  }
                                  title="فتح في تبويب جديد"
                                >
                                  <ExternalLink className="h-4 w-4" />
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>

              <div className="grid gap-3 p-3 lg:hidden">
                {filteredRecords.map((record) => {
                  const coordinates =
                    parseCoordinates(
                      record.coordinates
                    );
                  const isDeed =
                    record.type === 'deed';

                  return (
                    <Card
                      key={`${record.type}-${record.id}`}
                      className="overflow-hidden"
                    >
                      <CardContent className="space-y-4 p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-center gap-2">
                            {getRecordIcon(record.type)}
                            <Badge variant="outline">
                              {record.typeName}
                            </Badge>
                          </div>

                          <span className="font-mono text-xs font-semibold">
                            {getRecordIdentifier(record)}
                          </span>
                        </div>

                        <div>
                          <p className="text-xs text-muted-foreground">
                            المعلومات الأساسية
                          </p>
                          <p className="mt-1 text-sm font-medium">
                            {getRecordBasicInfo(record)}
                          </p>
                        </div>

                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                          <div>
                            <p className="text-xs text-muted-foreground">
                              المساحة
                            </p>
                            <p className="mt-1 text-sm">
                              {getRecordArea(
                                record,
                                t('deed.sqm')
                              )}
                            </p>
                          </div>

                          <div>
                            <p className="text-xs text-muted-foreground">
                              الموقع
                            </p>
                            <p className="mt-1 text-sm">
                              {getRecordLocation(record)}
                            </p>
                          </div>
                        </div>

                        <div className="flex flex-wrap gap-2 border-t pt-3">
                          <Button
                            type="button"
                            size="sm"
                            onClick={() =>
                              handleViewRecord(record)
                            }
                            className="gap-2"
                          >
                            <Eye className="h-4 w-4" />
                            {isDeed ? 'عرض الصك' : 'فتح القسم'}
                          </Button>

                          {coordinates && (
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              onClick={() =>
                                handleOpenLocation(record)
                              }
                              className="gap-2"
                            >
                              <Navigation className="h-4 w-4" />
                              الموقع
                            </Button>
                          )}

                          {isDeed && record.id && (
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              onClick={() =>
                                window.open(
                                  `/#/deeds/${record.id}`,
                                  '_blank'
                                )
                              }
                              className="gap-2"
                            >
                              <ExternalLink className="h-4 w-4" />
                              تبويب جديد
                            </Button>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
