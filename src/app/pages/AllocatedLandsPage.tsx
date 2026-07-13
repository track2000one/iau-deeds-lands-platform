import React, { useState } from 'react';
import { useNavigate } from 'react-router';
import { useTranslation } from 'react-i18next';
import { useData } from '../../context/DataContext';
import { usePermissions } from '../../context/PermissionsContext';
import { Plus, Eye, Trash2, MapPin, FileText } from 'lucide-react';
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
import type { AllocatedLand } from '../../types/models';

export const AllocatedLandsPage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { allocatedLands, deleteAllocatedLand } = useData();
  const { hasPermission } = usePermissions();
  const [searchQuery, setSearchQuery] = useState('');

  const filteredLands = allocatedLands.filter((land) =>
    Object.values(land).some((value) =>
      String(value).toLowerCase().includes(searchQuery.toLowerCase())
    )
  );

  const handleDelete = (id: string) => {
    if (!hasPermission('allocated_lands', 'canDelete')) {
      toast.error(t('permissions.cannotDeleteLands'));
      return;
    }

    if (confirm(t('confirmations.deleteLand'))) {
      deleteAllocatedLand(id);
      toast.success(t('success.landDeleted'));
    }
  };

  const handleView = (land: AllocatedLand) => {
    // Show details in a modal or navigate to details page
    toast.info(t('info.detailsUnderDevelopment'));
  };

  const openGoogleEarth = (coordinates?: string) => {
    if (!coordinates) {
      toast.error(t('errors.noCoordinates'));
      return;
    }
    const link = `https://earth.google.com/web/search/${coordinates}`;
    window.open(link, '_blank');
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">{t('lands.allocated')}</h1>
          <p className="text-muted-foreground">{t('lands.descriptionAllocated')}</p>
        </div>
        {hasPermission('allocated_lands', 'canAdd') && (
          <Button onClick={() => navigate('/lands/allocated/new')}>
            <Plus className="ml-2 h-4 w-4" />
            {t('lands.addNew')}
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
            placeholder={t('lands.searchPlaceholderAllocated')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t('lands.listAllocated')} ({filteredLands.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('deed.plotNumber')}</TableHead>
                  <TableHead>{t('deed.planNumber')}</TableHead>
                  <TableHead>{t('deed.area')}</TableHead>
                  <TableHead>{t('deed.usageType')}</TableHead>
                  <TableHead>{t('deed.city')}</TableHead>
                  <TableHead>{t('deed.district')}</TableHead>
                  <TableHead>{t('deed.region')}</TableHead>
                  <TableHead>{t('app.actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredLands.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center text-muted-foreground">
                      {t('lands.noAllocatedLands')}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredLands.map((land) => (
                    <TableRow key={land.id}>
                      <TableCell className="font-medium">{land.plotNumber}</TableCell>
                      <TableCell>{land.planNumber}</TableCell>
                      <TableCell>{land.area.toLocaleString()}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{land.usageType}</Badge>
                      </TableCell>
                      <TableCell>{land.city}</TableCell>
                      <TableCell>{land.district}</TableCell>
                      <TableCell>{land.region}</TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleView(land)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          {land.coordinates && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openGoogleEarth(land.coordinates)}
                            >
                              <MapPin className="h-4 w-4" />
                            </Button>
                          )}
                          {hasPermission('allocated_lands', 'canDelete') && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDelete(land.id)}
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
