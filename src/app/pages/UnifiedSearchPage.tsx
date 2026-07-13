import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useData } from '../../context/DataContext';
import { Search, FileText, MapPin, Building, Home } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { NativeSelect } from '../components/ui/native-select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
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

export const UnifiedSearchPage: React.FC = () => {
  const { t } = useTranslation();
  const {
    deeds,
    allocatedLands,
    deliveredLands,
    leasedLandsOut,
    leasedLandsIn,
    leasedBuildingsOut,
    leasedBuildingsIn,
  } = useData();

  const [searchQuery, setSearchQuery] = useState('');
  const [recordType, setRecordType] = useState<RecordType | 'all'>('all');

  const allRecords = [
    ...deeds.map((d) => ({ ...d, type: 'deed' as RecordType, typeName: t('search.deed') })),
    ...allocatedLands.map((l) => ({ ...l, type: 'allocated_land' as RecordType, typeName: t('search.allocatedLand') })),
    ...deliveredLands.map((l) => ({ ...l, type: 'delivered_land' as RecordType, typeName: t('search.deliveredLand') })),
    ...leasedLandsOut.map((l) => ({ ...l, type: 'leased_land_out' as RecordType, typeName: t('search.leasedLandOut') })),
    ...leasedLandsIn.map((l) => ({ ...l, type: 'leased_land_in' as RecordType, typeName: t('search.leasedLandIn') })),
    ...leasedBuildingsOut.map((b) => ({ ...b, type: 'leased_building_out' as RecordType, typeName: t('search.leasedBuildingOut') })),
    ...leasedBuildingsIn.map((b) => ({ ...b, type: 'leased_building_in' as RecordType, typeName: t('search.leasedBuildingIn') })),
  ];

  const filteredRecords = allRecords.filter((record) => {
    const matchesType = recordType === 'all' || record.type === recordType;
    const matchesSearch =
      searchQuery === '' ||
      Object.values(record).some((value) =>
        String(value).toLowerCase().includes(searchQuery.toLowerCase())
      );
    return matchesType && matchesSearch;
  });

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

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
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
                <Button>
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
                  <TableHead>{t('search.actions')}</TableHead>
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
                  filteredRecords.map((record) => (
                    <TableRow key={`${record.type}-${record.id}`}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {getRecordIcon(record.type)}
                          <Badge variant="outline">{record.typeName}</Badge>
                        </div>
                      </TableCell>
                      <TableCell className="font-mono text-sm">
                        {'deedNumber' in record && record.deedNumber}
                        {'plotNumber' in record && record.plotNumber}
                        {'contractNumber' in record && record.contractNumber}
                        {'buildingNumber' in record && record.buildingNumber}
                      </TableCell>
                      <TableCell>
                        {'propertyDescription' in record && record.propertyDescription}
                        {'recipientEntity' in record && record.recipientEntity}
                        {'tenant' in record && record.tenant.name}
                        {'owner' in record && record.owner.name}
                      </TableCell>
                      <TableCell>
                        {record.area ? `${record.area.toLocaleString()} ${t('deed.sqm')}` : '-'}
                      </TableCell>
                      <TableCell>
                        {'city' in record && record.city}
                        {'location' in record && record.location}
                        {'locationName' in record && record.locationName}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          {record.coordinates && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() =>
                                window.open(
                                  `https://earth.google.com/web/search/${record.coordinates}`,
                                  '_blank'
                                )
                              }
                            >
                              <MapPin className="h-4 w-4" />
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
