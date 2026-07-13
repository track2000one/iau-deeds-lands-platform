import React, { useState } from 'react';
import { useNavigate } from 'react-router';
import { useTranslation } from 'react-i18next';
import { useData } from '../../context/DataContext';
import { usePermissions } from '../../context/PermissionsContext';
import { Plus, Trash2, MapPin } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../components/ui/table';
import { Badge } from '../components/ui/badge';
import { toast } from 'sonner';

export const LeasedBuildingsOutPage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { leasedBuildingsOut, deleteLeasedBuildingOut } = useData();
  const { hasPermission } = usePermissions();
  const [searchQuery, setSearchQuery] = useState('');

  const filteredBuildings = leasedBuildingsOut.filter((building) =>
    Object.values(building).some((value) =>
      String(value).toLowerCase().includes(searchQuery.toLowerCase())
    )
  );

  const handleDelete = (id: string) => {
    if (!hasPermission('leased_buildings_out', 'canDelete')) {
      toast.error(t('permissions.cannotDeleteBuildings'));
      return;
    }

    if (confirm(t('confirmations.deleteBuilding'))) {
      deleteLeasedBuildingOut(id);
      toast.success(t('success.buildingDeleted'));
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">{t('buildings.leasedOut')}</h1>
          <p className="text-muted-foreground">{t('buildings.descriptionLeasedOut')}</p>
        </div>
        {hasPermission('leased_buildings_out', 'canAdd') && (
          <Button onClick={() => navigate('/buildings/leased-out/new')}>
            <Plus className="ml-2 h-4 w-4" />
            {t('buildings.addNew')}
          </Button>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t('common.searchAndFilter')}</CardTitle>
          <CardDescription>{t('search.placeholder')}</CardDescription>
        </CardHeader>
        <CardContent>
          <Input
            placeholder={t('buildings.searchPlaceholder')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t('buildings.list')} ({filteredBuildings.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('deed.tenant')}</TableHead>
                  <TableHead>{t('deed.contractNumber')}</TableHead>
                  <TableHead>{t('deed.buildingNumber')}</TableHead>
                  <TableHead>{t('deed.locationName')}</TableHead>
                  <TableHead>{t('deed.area')}</TableHead>
                  <TableHead>{t('deed.city')}</TableHead>
                  <TableHead>{t('deed.rentAmount')}</TableHead>
                  <TableHead>{t('app.actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredBuildings.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center text-muted-foreground">
                      {t('buildings.noLeasedBuildings')}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredBuildings.map((building) => (
                    <TableRow key={building.id}>
                      <TableCell className="font-medium">{building.tenant.name}</TableCell>
                      <TableCell>{building.contractNumber}</TableCell>
                      <TableCell>{building.buildingNumber}</TableCell>
                      <TableCell>{building.locationName}</TableCell>
                      <TableCell>{building.area.toLocaleString()}</TableCell>
                      <TableCell>{building.city}</TableCell>
                      <TableCell>
                        {building.rentAmount ? (
                          <Badge>{building.rentAmount.toLocaleString()} {t('currency.riyal')}</Badge>
                        ) : (
                          '-'
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          {building.coordinates && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => window.open(`https://earth.google.com/web/search/${building.coordinates}`, '_blank')}
                            >
                              <MapPin className="h-4 w-4" />
                            </Button>
                          )}
                          {hasPermission('leased_buildings_out', 'canDelete') && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDelete(building.id)}
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
    </div>
  );
};
