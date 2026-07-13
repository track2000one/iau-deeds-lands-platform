import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router';
import { useTranslation } from 'react-i18next';
import { useDeeds } from '../../context/DeedContext';
import {
  Search,
  Filter,
  Eye,
  Edit,
  Trash2,
  MapPin,
  FileText,
  Download,
  X
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import { Separator } from '../components/ui/separator';
import { NativeSelect } from '../components/ui/native-select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../components/ui/table';
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
import { toast } from 'sonner';

export const AllDeedsPage: React.FC = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { deeds, deleteDeed } = useDeeds();
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCity, setFilterCity] = useState('');
  const [filterPlanned, setFilterPlanned] = useState<'all' | 'planned' | 'unplanned'>('all');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deedToDelete, setDeedToDelete] = useState<string | null>(null);

  const filteredDeeds = useMemo(() => {
    let result = [...deeds];

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(deed =>
        deed.deedNumber.toLowerCase().includes(query) ||
        deed.city.toLowerCase().includes(query) ||
        deed.district.toLowerCase().includes(query) ||
        deed.propertyDescription.toLowerCase().includes(query)
      );
    }

    // City filter
    if (filterCity) {
      result = result.filter(deed => deed.city === filterCity);
    }

    // Planned filter
    if (filterPlanned === 'planned') {
      result = result.filter(deed => deed.isPlanned);
    } else if (filterPlanned === 'unplanned') {
      result = result.filter(deed => !deed.isPlanned);
    }

    return result;
  }, [deeds, searchQuery, filterCity, filterPlanned]);

  const cities = useMemo(() => {
    return Array.from(new Set(deeds.map(d => d.city))).sort();
  }, [deeds]);

  const handleDelete = (id: string) => {
    setDeedToDelete(id);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (deedToDelete) {
      deleteDeed(deedToDelete);
      toast.success(t('deed.deletedSuccessfully'));
      setDeleteDialogOpen(false);
      setDeedToDelete(null);
    }
  };

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 md:gap-4">
        <div className="min-w-0">
          <h1 className="text-2xl md:text-3xl font-bold truncate">{t('nav.allDeeds')}</h1>
          <p className="text-sm md:text-base text-muted-foreground mt-1">
            {t('search.foundResults', { count: filteredDeeds.length })}
          </p>
        </div>
        <Button onClick={() => navigate('/deeds/new')} className="bg-primary w-full sm:w-auto text-sm md:text-base">
          <FileText className="h-4 w-4 mr-2" />
          {t('deed.addNew')}
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader className="pb-3 md:pb-4">
          <CardTitle className="flex items-center gap-2 text-base md:text-lg">
            <Filter className="h-4 w-4 md:h-5 md:w-5" />
            {t('app.filter')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
            {/* Search */}
            <div className="sm:col-span-2 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-3 w-3 md:h-4 md:w-4 text-muted-foreground" />
              <Input
                placeholder={t('search.placeholder')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 md:pl-10 h-9 md:h-10 text-sm md:text-base"
              />
              {searchQuery && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute right-1 top-1/2 transform -translate-y-1/2 h-7 w-7"
                  onClick={() => setSearchQuery('')}
                >
                  <X className="h-3 w-3 md:h-4 md:w-4" />
                </Button>
              )}
            </div>

            {/* City Filter */}
            <div>
              <NativeSelect
                value={filterCity}
                onChange={(e) => setFilterCity(e.target.value)}
                className="h-9 md:h-10 text-sm md:text-base"
              >
                <option value="">جميع المدن</option>
                {cities.map(city => (
                  <option key={city} value={city}>{city}</option>
                ))}
              </NativeSelect>
            </div>

            {/* Planned Filter */}
            <div>
              <NativeSelect
                value={filterPlanned}
                onChange={(e) => setFilterPlanned(e.target.value as any)}
                className="h-9 md:h-10 text-sm md:text-base"
              >
                <option value="all">جميع الأراضي</option>
                <option value="planned">مخططة فقط</option>
                <option value="unplanned">غير مخططة فقط</option>
              </NativeSelect>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Table - Desktop View */}
      <Card className="hidden md:block">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[120px]">{t('deed.deedNumber')}</TableHead>
                  <TableHead>{t('deed.propertyDescription')}</TableHead>
                  <TableHead>{t('deed.city')}</TableHead>
                  <TableHead>{t('deed.district')}</TableHead>
                  <TableHead className="text-center">{t('deed.area')}</TableHead>
                  <TableHead className="text-center">{t('deed.isPlanned')}</TableHead>
                  <TableHead className="text-center">{t('deed.coordinates')}</TableHead>
                  <TableHead className="text-left w-[180px]">الإجراءات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredDeeds.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-12">
                      <FileText className="h-12 w-12 mx-auto mb-3 opacity-30" />
                      <p className="text-muted-foreground">{t('search.noResults')}</p>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredDeeds.map((deed) => (
                    <TableRow key={deed.id} className="hover:bg-muted/30">
                      <TableCell className="font-medium">{deed.deedNumber}</TableCell>
                      <TableCell className="max-w-[200px] truncate">
                        {deed.propertyDescription}
                      </TableCell>
                      <TableCell>{deed.city}</TableCell>
                      <TableCell>{deed.district}</TableCell>
                      <TableCell className="text-center">
                        {deed.area.toLocaleString()} {t('deed.sqm')}
                      </TableCell>
                      <TableCell className="text-center">
                        {deed.isPlanned ? (
                          <Badge variant="secondary" className="text-xs">نعم</Badge>
                        ) : (
                          <Badge variant="outline" className="text-xs">لا</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        {deed.coordinates ? (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => navigate(`/maps/${deed.id}`)}
                            title={t('maps.viewOnMap')}
                          >
                            <MapPin className="h-4 w-4 text-primary" />
                          </Button>
                        ) : (
                          <span className="text-muted-foreground text-xs">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => navigate(`/deeds/${deed.id}`)}
                            title={t('app.view')}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => navigate(`/deeds/${deed.id}`)}
                            title={t('app.edit')}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive hover:text-destructive"
                            onClick={() => handleDelete(deed.id)}
                            title={t('app.delete')}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
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

      {/* Cards View - Mobile */}
      <div className="md:hidden space-y-3">
        {filteredDeeds.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <FileText className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p className="text-sm text-muted-foreground">{t('search.noResults')}</p>
            </CardContent>
          </Card>
        ) : (
          filteredDeeds.map((deed) => (
            <Card key={deed.id} className="overflow-hidden">
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-bold text-base truncate">{deed.deedNumber}</span>
                      {deed.isPlanned && (
                        <Badge variant="secondary" className="text-xs shrink-0">مخططة</Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground truncate">{deed.city} - {deed.district}</p>
                  </div>
                  {deed.coordinates && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 shrink-0"
                      onClick={() => navigate(`/maps/${deed.id}`)}
                    >
                      <MapPin className="h-4 w-4 text-primary" />
                    </Button>
                  )}
                </div>

                <p className="text-xs text-muted-foreground line-clamp-2 mb-3">
                  {deed.propertyDescription}
                </p>

                <div className="flex items-center justify-between text-xs mb-3">
                  <span className="text-muted-foreground">{t('deed.area')}:</span>
                  <span className="font-medium">{deed.area.toLocaleString()} {t('deed.sqm')}</span>
                </div>

                <Separator className="mb-3" />

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 text-xs h-8"
                    onClick={() => navigate(`/deeds/${deed.id}`)}
                  >
                    <Eye className="h-3 w-3 mr-1" />
                    {t('app.view')}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 text-xs h-8"
                    onClick={() => navigate(`/deeds/${deed.id}`)}
                  >
                    <Edit className="h-3 w-3 mr-1" />
                    {t('app.edit')}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-xs h-8 text-destructive hover:text-destructive"
                    onClick={() => handleDelete(deed.id)}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('deed.deleteDeed')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('deed.confirmDelete')}
              <br />
              <span className="text-destructive">{t('deed.deleteWarning')}</span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('app.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {t('app.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
