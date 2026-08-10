import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import { useTranslation } from 'react-i18next';
import { useDeeds } from '../../context/DeedContext';
import { usePermissions } from '../../context/PermissionsContext';
import {
  Building2,
  Edit,
  Eye,
  FileText,
  Filter,
  Map,
  MapPin,
  Ruler,
  Search,
  Trash2,
  X,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import { NativeSelect } from '../components/ui/native-select';
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
  const { isAdmin } = usePermissions();

  const [searchQuery, setSearchQuery] = useState('');
  const [filterCity, setFilterCity] = useState('');
  const [filterPlanned, setFilterPlanned] = useState<'all' | 'planned' | 'unplanned'>('all');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deedToDelete, setDeedToDelete] = useState<string | null>(null);

  const filteredDeeds = useMemo(() => {
    let result = [...deeds];

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter((deed) =>
        [deed.deedNumber, deed.city, deed.district, deed.propertyDescription]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(query))
      );
    }

    if (filterCity) result = result.filter((deed) => deed.city === filterCity);
    if (filterPlanned === 'planned') result = result.filter((deed) => deed.isPlanned);
    if (filterPlanned === 'unplanned') result = result.filter((deed) => !deed.isPlanned);

    return result;
  }, [deeds, searchQuery, filterCity, filterPlanned]);

  const cities = useMemo(
    () => Array.from(new Set(deeds.map((deed) => deed.city).filter(Boolean))).sort(),
    [deeds]
  );

  const totalArea = useMemo(
    () => filteredDeeds.reduce((sum, deed) => sum + (Number(deed.area) || 0), 0),
    [filteredDeeds]
  );

  const handleDelete = (id: string) => {
    if (!isAdmin) {
      toast.error('ليس لديك صلاحية حذف الصكوك');
      return;
    }
    setDeedToDelete(id);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (deedToDelete && isAdmin) {
      deleteDeed(deedToDelete);
      toast.success(t('deed.deletedSuccessfully'));
      setDeleteDialogOpen(false);
      setDeedToDelete(null);
    }
  };

  return (
    <div className="mobile-full-width w-full min-w-0 space-y-5 rounded-2xl border border-sky-200/70 bg-gradient-to-br from-white via-sky-50/70 to-violet-50/50 p-3 shadow-[0_24px_80px_rgba(30,64,175,0.12)] backdrop-blur-xl sm:p-4 md:p-6">
      <section className="flex flex-col gap-4 rounded-[26px] border border-white/60 bg-white/75 p-4 shadow-sm backdrop-blur-xl sm:p-5 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
          <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-primary">
            <FileText className="h-4 w-4" />
            إدارة الصكوك
          </div>
          <h1 className="text-2xl font-black tracking-tight text-slate-800 md:text-3xl">{t('nav.allDeeds')}</h1>
          <p className="mt-1 text-sm text-muted-foreground">عرض الصكوك كبطاقات واضحة وسريعة للوصول إلى بيانات كل صك.</p>
        </div>

        {isAdmin && (
          <Button
            onClick={() => navigate('/deeds/new')}
            className="h-11 w-full bg-gradient-to-l from-sky-600 to-blue-700 text-white shadow-[0_12px_35px_rgba(37,99,235,0.22)] hover:from-sky-500 hover:to-blue-600 sm:w-auto"
          >
            <FileText className="ml-2 h-4 w-4" />
            {t('deed.addNew')}
          </Button>
        )}
      </section>

      <Card className="overflow-hidden border-sky-200/70 bg-white/85 shadow-[0_18px_55px_rgba(15,23,42,0.08)] backdrop-blur-xl">
        <CardHeader className="border-b border-sky-100/80 bg-gradient-to-l from-sky-50/95 via-white to-violet-50/75 pb-4">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Filter className="h-5 w-5" />
            {t('app.filter')}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 sm:p-5">
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-4">
            <div className="relative lg:col-span-2">
              <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="ابحث عن صك، مدينة، حي أو بيان العقار..."
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                className="h-11 rounded-xl pr-10"
              />
              {searchQuery && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute left-1 top-1/2 h-8 w-8 -translate-y-1/2"
                  onClick={() => setSearchQuery('')}
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>

            <NativeSelect value={filterCity} onChange={(event) => setFilterCity(event.target.value)} className="h-11 rounded-xl">
              <option value="">جميع المدن</option>
              {cities.map((city) => <option key={city} value={city}>{city}</option>)}
            </NativeSelect>

            <NativeSelect
              value={filterPlanned}
              onChange={(event) => setFilterPlanned(event.target.value as 'all' | 'planned' | 'unplanned')}
              className="h-11 rounded-xl"
            >
              <option value="all">جميع الأراضي</option>
              <option value="planned">مخططة فقط</option>
              <option value="unplanned">غير مخططة فقط</option>
            </NativeSelect>
          </div>
        </CardContent>
      </Card>

      <section className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-sky-200/70 bg-white/80 p-4 shadow-sm">
          <p className="text-xs text-muted-foreground">إجمالي الصكوك الظاهرة</p>
          <p className="mt-1 text-2xl font-black">{filteredDeeds.length.toLocaleString('ar-SA')}</p>
        </div>
        <div className="rounded-2xl border border-sky-200/70 bg-white/80 p-4 shadow-sm">
          <p className="text-xs text-muted-foreground">الأراضي المخططة</p>
          <p className="mt-1 text-2xl font-black">{filteredDeeds.filter((deed) => deed.isPlanned).length.toLocaleString('ar-SA')}</p>
        </div>
        <div className="rounded-2xl border border-sky-200/70 bg-white/80 p-4 shadow-sm">
          <p className="text-xs text-muted-foreground">إجمالي المساحة</p>
          <p className="mt-1 text-2xl font-black">{totalArea.toLocaleString('ar-SA', { maximumFractionDigits: 2 })} م²</p>
        </div>
      </section>

      {filteredDeeds.length === 0 ? (
        <Card className="border-sky-200/70 bg-white/85 shadow-sm">
          <CardContent className="flex min-h-[300px] flex-col items-center justify-center p-8 text-center">
            <div className="grid h-20 w-20 place-items-center rounded-[28px] border bg-background/80 shadow-inner">
              <FileText className="h-10 w-10 text-primary/45" />
            </div>
            <h2 className="mt-5 text-xl font-black">لا توجد صكوك مطابقة</h2>
            <p className="mt-2 text-sm text-muted-foreground">غيّر كلمة البحث أو خيارات التصفية.</p>
          </CardContent>
        </Card>
      ) : (
        <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filteredDeeds.map((deed) => (
            <article
              key={deed.id}
              className="rounded-[24px] border border-slate-300/80 bg-white/90 p-4 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:border-sky-300 hover:shadow-md sm:p-5"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground">رقم الصك</p>
                  <h2 className="mt-1 truncate text-lg font-black text-slate-800">{deed.deedNumber}</h2>
                </div>
                <Badge
                  variant="outline"
                  className={deed.isPlanned
                    ? 'shrink-0 border-emerald-300 bg-emerald-50 text-emerald-700'
                    : 'shrink-0 border-red-300 bg-red-50 text-red-700'}
                >
                  {deed.isPlanned ? 'مخططة' : 'غير مخططة'}
                </Badge>
              </div>

              <div className="mt-4 rounded-2xl border bg-slate-50/65 p-3">
                <p className="text-xs text-muted-foreground">بيان العقار</p>
                <p className="mt-1 min-h-[42px] text-sm font-semibold leading-6 text-slate-700">{deed.propertyDescription || '-'}</p>
              </div>

              <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
                <div>
                  <dt className="flex items-center gap-1 text-xs text-muted-foreground"><Building2 className="h-3.5 w-3.5" />المدينة</dt>
                  <dd className="mt-1 font-semibold">{deed.city || '-'}</dd>
                </div>
                <div>
                  <dt className="flex items-center gap-1 text-xs text-muted-foreground"><MapPin className="h-3.5 w-3.5" />الحي</dt>
                  <dd className="mt-1 font-semibold">{deed.district || '-'}</dd>
                </div>
                <div>
                  <dt className="flex items-center gap-1 text-xs text-muted-foreground"><Ruler className="h-3.5 w-3.5" />المساحة</dt>
                  <dd className="mt-1 font-semibold">{Number(deed.area || 0).toLocaleString('ar-SA', { maximumFractionDigits: 2 })} م²</dd>
                </div>
                <div>
                  <dt className="flex items-center gap-1 text-xs text-muted-foreground"><Map className="h-3.5 w-3.5" />الإحداثيات</dt>
                  <dd className="mt-1 font-semibold">{deed.coordinates ? 'متوفرة' : 'غير متوفرة'}</dd>
                </div>
              </dl>

              <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-3">
                <Button variant="outline" size="sm" className="h-10" onClick={() => navigate(`/deeds/${deed.id}`)}>
                  <Eye className="ml-1 h-4 w-4" />عرض
                </Button>

                {deed.coordinates && (
                  <Button variant="outline" size="sm" className="h-10" onClick={() => navigate(`/maps/${deed.id}`)}>
                    <MapPin className="ml-1 h-4 w-4" />الخريطة
                  </Button>
                )}

                {isAdmin && (
                  <Button variant="outline" size="sm" className="h-10" onClick={() => navigate(`/deeds/${deed.id}`)}>
                    <Edit className="ml-1 h-4 w-4" />تعديل
                  </Button>
                )}

                {isAdmin && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-10 text-red-600 hover:border-red-300 hover:bg-red-50 hover:text-red-700"
                    onClick={() => handleDelete(deed.id)}
                  >
                    <Trash2 className="ml-1 h-4 w-4" />حذف
                  </Button>
                )}
              </div>
            </article>
          ))}
        </section>
      )}

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
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {t('app.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
