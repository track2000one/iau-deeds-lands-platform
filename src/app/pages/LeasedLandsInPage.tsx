import React, { useState } from 'react';
import { useNavigate } from 'react-router';
import { useTranslation } from 'react-i18next';
import { useData } from '../../context/DataContext';
import { usePermissions } from '../../context/PermissionsContext';
import { Plus, Eye, Trash2, MapPin } from 'lucide-react';
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

export const LeasedLandsInPage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { leasedLandsIn, deleteLeasedLandIn } = useData();
  const { hasPermission } = usePermissions();
  const [searchQuery, setSearchQuery] = useState('');

  const filteredLands = leasedLandsIn.filter((land) =>
    Object.values(land).some((value) =>
      String(value).toLowerCase().includes(searchQuery.toLowerCase())
    )
  );

  const handleDelete = (id: string) => {
    if (!hasPermission('leased_lands_in', 'canDelete')) {
      toast.error(t('permissions.cannotDeleteLands'));
      return;
    }

    if (confirm(t('confirmations.deleteLand'))) {
      deleteLeasedLandIn(id);
      toast.success(t('success.landDeleted'));
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">{t('lands.leasedIn')}</h1>
          <p className="text-muted-foreground">{t('lands.descriptionLeasedIn')}</p>
        </div>
        {hasPermission('leased_lands_in', 'canAdd') && (
          <Button onClick={() => navigate('/lands/leased-in/new')}>
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
            placeholder={t('lands.searchPlaceholderLeased')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t('lands.list')} ({filteredLands.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('deed.owner')}</TableHead>
                  <TableHead>{t('deed.contractNumber')}</TableHead>
                  <TableHead>{t('deed.contractDuration')}</TableHead>
                  <TableHead>{t('deed.area')}</TableHead>
                  <TableHead>{t('deed.location')}</TableHead>
                  <TableHead>{t('deed.rentAmount')}</TableHead>
                  <TableHead>{t('app.actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredLands.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground">
                      {t('lands.noRentedLands')}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredLands.map((land) => (
                    <TableRow key={land.id}>
                      <TableCell className="font-medium">{land.owner.name}</TableCell>
                      <TableCell>{land.contractNumber}</TableCell>
                      <TableCell>{land.contractDuration}</TableCell>
                      <TableCell>{land.area.toLocaleString()}</TableCell>
                      <TableCell>{land.location}</TableCell>
                      <TableCell>
                        {land.rentAmount ? (
                          <Badge>{land.rentAmount.toLocaleString()} {t('currency.riyal')}</Badge>
                        ) : (
                          '-'
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          {land.coordinates && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => window.open(`https://earth.google.com/web/search/${land.coordinates}`, '_blank')}
                            >
                              <MapPin className="h-4 w-4" />
                            </Button>
                          )}
                          {hasPermission('leased_lands_in', 'canDelete') && (
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
