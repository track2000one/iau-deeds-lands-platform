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

export const LeasedLandsOutPage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { leasedLandsOut, deleteLeasedLandOut } = useData();
  const { hasPermission } = usePermissions();
  const [searchQuery, setSearchQuery] = useState('');

  const filteredLands = leasedLandsOut.filter((land) =>
    Object.values(land).some((value) =>
      String(value).toLowerCase().includes(searchQuery.toLowerCase())
    )
  );

  const handleDelete = (id: string) => {
    if (!hasPermission('leased_lands_out', 'canDelete')) {
      toast.error(t('permissions.cannotDeleteLands'));
      return;
    }

    if (confirm(t('confirmations.deleteLand'))) {
      deleteLeasedLandOut(id);
      toast.success(t('success.landDeleted'));
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">{t('lands.leasedOut')}</h1>
          <p className="text-muted-foreground">{t('lands.descriptionLeasedOut')}</p>
        </div>
        {hasPermission('leased_lands_out', 'canAdd') && (
          <Button onClick={() => navigate('/lands/leased-out/new')}>
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
                  <TableHead>{t('deed.tenant')}</TableHead>
                  <TableHead>{t('deed.contractNumber')}</TableHead>
                  <TableHead>{t('deed.contractStartDate')}</TableHead>
                  <TableHead>{t('deed.contractDuration')}</TableHead>
                  <TableHead>{t('deed.plotNumber')}</TableHead>
                  <TableHead>{t('deed.area')}</TableHead>
                  <TableHead>{t('deed.rentAmount')}</TableHead>
                  <TableHead>{t('app.actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredLands.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center text-muted-foreground">
                      {t('lands.noLeasedLands')}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredLands.map((land) => (
                    <TableRow key={land.id}>
                      <TableCell className="font-medium">{land.tenant.name}</TableCell>
                      <TableCell>{land.contractNumber}</TableCell>
                      <TableCell>{new Date(land.contractStartDate).toLocaleDateString('ar-SA')}</TableCell>
                      <TableCell>{land.contractDuration}</TableCell>
                      <TableCell>{land.plotNumber}</TableCell>
                      <TableCell>{land.area.toLocaleString()}</TableCell>
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
                          {hasPermission('leased_lands_out', 'canDelete') && (
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
