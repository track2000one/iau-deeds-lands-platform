import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import { useTranslation } from 'react-i18next';
import { useData } from '../../context/DataContext';
import { useDeeds } from '../../context/DeedContext';
import {
  Search,
  FileText,
  MapPin,
  Building,
  Home,
  Eye,
  ExternalLink,
  Navigation,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
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
import type { RecordType } from '../../types/models';

type SearchRecord = any & {
  type: RecordType;
  typeName: string;
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

      if (trimmed.startsWith('{')) {
        raw = JSON.parse(trimmed);
      } else {
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

const safeText = (value: unknown) => {
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

const getRecordViewPath = (record: SearchRecord) => {
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

const getRecordIdentifier = (record: SearchRecord) => {
  return (
    record.deedNumber ||
    record.plotNumber ||
    record.contractNumber ||
    record.buildingNumber ||
    record.recordNumber ||
    record.documentNumber ||
    record.id ||
    '-'
  );
};

const getRecordBasicInfo = (record: SearchRecord) => {
  return (
    record.propertyDescription ||
    record.description ||
    record.recipientEntity ||
    record.tenant?.name ||
    record.tenantName ||
    record.owner?.name ||
    record.ownerName ||
    record.entityName ||
    record.name ||
    '-'
  );
};

const getRecordArea = (record: SearchRecord, sqmLabel: string) => {
  const area = Number(record.area || 0);

  if (!area || Number.isNaN(area)) return '-';

  return `${area.toLocaleString()} ${sqmLabel}`;
};

const getRecordLocation = (record: SearchRecord) => {
  const parts = [
    record.region,
    record.city,
    record.district,
    record.location,
    record.locationName,
  ]
    .map((item) => safeText(item).trim())
    .filter(Boolean);

  return parts.length > 0 ? parts.join(' - ') : '-';
};

export const UnifiedSearchPage: React.FC = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { deeds } = useDeeds();

  const {
    allocatedLands,
    deliveredLands,
    leasedLandsOut,
    leasedLandsIn,
    leasedBuildingsOut,
    leasedBuildingsIn,
  } = useData();

  const [searchQuery, setSearchQuery] = useState('');
  const [recordType, setRecordType] = useState<RecordType | 'all'>('all');

  const allRecords = useMemo<SearchRecord[]>(() => {
    return [
      ...deeds.map((d) => ({ ...d, type: 'deed' as RecordType, typeName: t('search.deed') })),
      ...allocatedLands.map((l) => ({ ...l, type: 'allocated_land' as RecordType, typeName: t('search.allocatedLand') })),
      ...deliveredLands.map((l) => ({ ...l, type: 'delivered_land' as RecordType, typeName: t('search.deliveredLand') })),
      ...leasedLandsOut.map((l) => ({ ...l, type: 'leased_land_out' as RecordType, typeName: t('search.leasedLandOut') })),
      ...leasedLandsIn.map((l) => ({ ...l, type: 'leased_land_in' as RecordType, typeName: t('search.leasedLandIn') })),
      ...leasedBuildingsOut.map((b) => ({ ...b, type: 'leased_building_out' as RecordType, typeName: t('search.leasedBuildingOut') })),
      ...leasedBuildingsIn.map((b) => ({ ...b, type: 'leased_building_in' as RecordType, typeName: t('search.leasedBuildingIn') })),
    ];
  }, [
    deeds,
    allocatedLands,
    deliveredLands,
    leasedLandsOut,
    leasedLandsIn,
    leasedBuildingsOut,
    leasedBuildingsIn,
    t,
  ]);

  const filteredRecords = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    return allRecords.filter((record) => {
      const matchesType = recordType === 'all' || record.type === recordType;

      const matchesSearch =
        query === '' ||
        Object.values(record).some((value) =>
          safeText(value).toLowerCase().includes(query)
        );

      return matchesType && matchesSearch;
    });
  }, [allRecords, recordType, searchQuery]);

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
        return <Home className="h-4 w-4" />;
    }
  };

  const handleViewRecord = (record: SearchRecord) => {
    const path = getRecordViewPath(record);
    navigate(path);
  };

  const handleOpenLocation = (record: SearchRecord) => {
    const coordinates = parseCoordinates(record.coordinates);

    if (!coordinates) return;

    window.open(
      `https://www.google.com/maps?q=${coordinates.latitude},${coordinates.longitude}`,
      '_blank',
      'noopener,noreferrer'
    );
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="text-center">
        <h1 className="text-3xl font-bold">{t('search.unifiedSearch')}</h1>
        <p className="text-muted-foreground">{t('search.searchAllRecords')}</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t('search.searchCriteria')}</CardTitle>
          <CardDescription>{t('search.searchCriteria')}</CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="recordType">{t('search.recordTypeLabel')}</Label>
              <NativeSelect
                id="recordType"
                value={recordType}
                onChange={(e) => setRecordType(e.target.value as RecordType | 'all')}
              >
                <option value="all">{t('search.allRecords')}</option>
                <option value="deed">{t('search.deeds')}</option>
                <option value="allocated_land">{t('search.allocatedLands')}</option>
                <option value="delivered_land">{t('search.deliveredLands')}</option>
                <option value="leased_land_out">{t('search.leasedLandsOut')}</option>
                <option value="leased_land_in">{t('search.leasedLandsIn')}</option>
                <option value="leased_building_out">{t('search.leasedBuildingsOut')}</option>
                <option value="leased_building_in">{t('search.leasedBuildingsIn')}</option>
              </NativeSelect>
            </div>

            <div className="space-y-2">
              <Label htmlFor="searchQuery">{t('search.searchKeyword')}</Label>
              <div className="flex gap-2">
                <Input
                  id="searchQuery"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={t('search.searchPlaceholderUnified')}
                />

                <Button type="button" title="بحث">
                  <Search className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t('search.results')} ({filteredRecords.length})</CardTitle>
          <CardDescription>
            {searchQuery
              ? t('search.searchResultsFor', { query: searchQuery })
              : t('search.allRecordsShown')}
          </CardDescription>
        </CardHeader>

        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('search.type')}</TableHead>
                  <TableHead>{t('search.identifier')}</TableHead>
                  <TableHead>{t('search.basicInfo')}</TableHead>
                  <TableHead>{t('search.area')}</TableHead>
                  <TableHead>{t('search.location')}</TableHead>
                  <TableHead className="text-center">{t('search.actions')}</TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {filteredRecords.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground">
                      {t('search.noResults')}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredRecords.map((record) => {
                    const coordinates = parseCoordinates(record.coordinates);
                    const isDeed = record.type === 'deed';

                    return (
                      <TableRow key={`${record.type}-${record.id}`} className="hover:bg-muted/40">
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {getRecordIcon(record.type)}
                            <Badge variant="outline">{record.typeName}</Badge>
                          </div>
                        </TableCell>

                        <TableCell className="font-mono text-sm">
                          {getRecordIdentifier(record)}
                        </TableCell>

                        <TableCell>
                          {getRecordBasicInfo(record)}
                        </TableCell>

                        <TableCell>
                          {getRecordArea(record, t('deed.sqm'))}
                        </TableCell>

                        <TableCell>
                          {getRecordLocation(record)}
                        </TableCell>

                        <TableCell>
                          <div className="flex flex-wrap items-center justify-center gap-2">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => handleViewRecord(record)}
                              title={isDeed ? 'عرض الصك' : 'فتح القسم'}
                              className="gap-1"
                            >
                              <Eye className="h-4 w-4" />
                              {isDeed ? 'عرض' : 'فتح'}
                            </Button>

                            {coordinates && (
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => handleOpenLocation(record)}
                                title="عرض الموقع على الخريطة"
                              >
                                <Navigation className="h-4 w-4" />
                              </Button>
                            )}

                            {isDeed && record.id && (
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => window.open(`/#/deeds/${record.id}`, '_blank')}
                                title="فتح في تبويب جديد"
                              >
                                <ExternalLink className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t('search.searchStatistics')}</CardTitle>
        </CardHeader>

        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <p className="text-2xl font-bold">{deeds.length}</p>
              <p className="text-sm text-muted-foreground">{t('search.totalDeeds')}</p>
            </div>

            <div className="text-center">
              <p className="text-2xl font-bold">{allocatedLands.length + deliveredLands.length}</p>
              <p className="text-sm text-muted-foreground">{t('search.totalLands')}</p>
            </div>

            <div className="text-center">
              <p className="text-2xl font-bold">
                {leasedBuildingsOut.length + leasedBuildingsIn.length}
              </p>
              <p className="text-sm text-muted-foreground">{t('search.totalBuildings')}</p>
            </div>

            <div className="text-center">
              <p className="text-2xl font-bold">{filteredRecords.length}</p>
              <p className="text-sm text-muted-foreground">{t('search.totalResults')}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
