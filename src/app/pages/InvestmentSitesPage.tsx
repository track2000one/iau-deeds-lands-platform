import React from 'react';
import { ArrowRight, Building2, FileText, FolderPlus, Pencil, Search } from 'lucide-react';
import { useNavigate } from 'react-router';
import { toast } from 'sonner';
import { usePermissions } from '../../context/PermissionsContext';
import { investmentsApi } from '../../features/investments/api';
import { INVESTMENT_SITE_PRESETS } from '../../features/investments/sitePresets';
import { getInvestmentAreaPresets } from '../../features/investments/areaPresets';
import type { InvestmentSite } from '../../features/investments/types';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Input } from '../components/ui/input';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '../components/ui/table';

export const InvestmentSitesPage: React.FC = () => {
  const navigate = useNavigate();
  const { isAdmin, hasPermission } = usePermissions();
  const canAdd = isAdmin || hasPermission('investments', 'canAdd');
  const canEdit = isAdmin || hasPermission('investments', 'canEdit');
  const [search, setSearch] = React.useState('');
  const [sites, setSites] = React.useState<InvestmentSite[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState('');
  const [importingCode, setImportingCode] = React.useState<string | null>(null);

  React.useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        setLoading(true);
        setError('');
        const response = await investmentsApi.getSites({ limit: 100 });
        if (!cancelled) setSites(response.items);
      } catch (reason) {
        if (cancelled) return;
        const message = reason instanceof Error ? reason.message : 'تعذر تحميل المواقع الاستثمارية';
        setError(message);
        toast.error(message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, []);

  const visibleSites = sites.filter((site) =>
    [site.name, site.code, site.deed?.deedNumber || '']
      .some((value) => value.toLowerCase().includes(search.trim().toLowerCase()))
  );
  const linked = sites.filter((site) => site.deedId).length;
  const areasCount = sites.reduce((sum, site) => sum + (site._count?.areas || 0), 0);
  const knownCodes = new Set(sites.map((site) => site.code.toUpperCase()));
  const sitesByCode = new Map(sites.map((site) => [site.code.toUpperCase(), site]));

  const handleImportAreas = async (site: InvestmentSite) => {
    const presets = getInvestmentAreaPresets(site.code);

    if (!presets.length) {
      toast.error('لا توجد مساحات مرجعية مرتبطة بهذا الموقع.');
      return;
    }

    const confirmed = window.confirm(
      `سيتم استيراد ${presets.length} مساحة مرجعية إلى "${site.name}". لن يتم استبدال أي مساحة موجودة مسبقًا. هل تريد المتابعة؟`
    );

    if (!confirmed) return;

    try {
      setImportingCode(site.code);

      const result = await investmentsApi.bulkImportAreas(site.id, presets);

      if (result.created > 0) {
        toast.success(
          `تم إنشاء ${result.created} مساحة، وتم تجاوز ${result.skipped} مساحة موجودة مسبقًا.`
        );
      } else {
        toast.info('جميع مساحات البيان لهذا الموقع مسجلة مسبقًا.');
      }

      const response = await investmentsApi.getSites({ limit: 100 });
      setSites(response.items);
    } catch (reason) {
      toast.error(
        reason instanceof Error ? reason.message : 'تعذر استيراد مساحات البيان'
      );
    } finally {
      setImportingCode(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <Button variant="ghost" className="mb-2 px-0" onClick={() => navigate('/investments')}>
            <ArrowRight className="me-2 h-4 w-4" />
            المساحات والفرص الاستثمارية
          </Button>
          <h1 className="text-2xl font-bold">المواقع الاستثمارية الرئيسية</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            إدارة الأراضي الرئيسية وربط كل أرض بالصك المسجل قبل إضافة المساحات التابعة لها.
          </p>
        </div>
        {canAdd && (
          <Button onClick={() => navigate('/investments/sites/new')}>
            <FolderPlus className="me-2 h-4 w-4" />
            إضافة موقع رئيسي
          </Button>
        )}
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">المواقع المعروضة</CardTitle></CardHeader>
          <CardContent className="text-3xl font-bold">{sites.length}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">المواقع المرتبطة بصك</CardTitle></CardHeader>
          <CardContent className="text-3xl font-bold">{linked}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">المساحات المسجلة تحتها</CardTitle></CardHeader>
          <CardContent className="text-3xl font-bold">{areasCount}</CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">المواقع الواردة في بيان الأراضي الشاغرة</CardTitle>
          <p className="text-xs leading-6 text-muted-foreground">
            هذه بطاقات مرجعية مبنية على بيان الأراضي الشاغرة. يتم تسجيل الموقع وربطه بالصك أولًا، ثم يمكن استيراد مساحاته التقريبية دون استبدال أي سجل موجود.
          </p>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {INVESTMENT_SITE_PRESETS.map((preset) => {
            const registered = knownCodes.has(preset.code);
            return (
              <div key={preset.code} className="rounded-xl border bg-muted/20 p-4">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold">{preset.name}</p>
                    <p className="mt-1 text-xs text-muted-foreground" dir="ltr">{preset.code}</p>
                  </div>
                  <Badge variant="outline">{registered ? 'مسجل' : 'غير مسجل'}</Badge>
                </div>
                <div className="mt-4 flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">
                    {preset.expectedAreas} مساحات وفق البيان
                  </span>
                  {canAdd && !registered && !loading && !error && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => navigate(`/investments/sites/new?preset=${preset.code}`)}
                    >
                      تسجيل الموقع
                    </Button>
                  )}

                  {canAdd && registered && !loading && !error && (() => {
                    const site = sitesByCode.get(preset.code);
                    if (!site) return null;

                    const currentAreas = site._count?.areas || 0;
                    const complete = currentAreas >= preset.expectedAreas;

                    return (
                      <Button
                        size="sm"
                        variant={complete ? 'ghost' : 'outline'}
                        disabled={complete || importingCode === preset.code}
                        onClick={() => handleImportAreas(site)}
                      >
                        {complete
                          ? 'المساحات مكتملة'
                          : importingCode === preset.code
                            ? 'جارٍ الاستيراد...'
                            : `استيراد ${preset.expectedAreas} مساحة`}
                      </Button>
                    );
                  })()}
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle className="text-base">المواقع المسجلة فعليًا</CardTitle>
            <div className="relative w-full sm:w-80">
              <Search className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                className="pr-9"
                placeholder="البحث باسم الموقع أو رمزه..."
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>رمز الموقع</TableHead>
                <TableHead>اسم الموقع الرئيسي</TableHead>
                <TableHead>الصك المرتبط</TableHead>
                <TableHead>المساحات</TableHead>
                <TableHead>الإجراءات</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {visibleSites.map((site) => (
                <TableRow key={site.id}>
                  <TableCell className="font-semibold" dir="ltr">{site.code}</TableCell>
                  <TableCell>{site.name}</TableCell>
                  <TableCell>
                    {site.deed?.deedNumber
                      ? <span className="inline-flex items-center gap-2"><FileText className="h-4 w-4" />{site.deed.deedNumber}</span>
                      : <Badge variant="outline">بانتظار الربط</Badge>}
                  </TableCell>
                  <TableCell>{site._count?.areas ?? 0}</TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => navigate(`/investments?siteId=${encodeURIComponent(site.id)}`)}
                      >
                        عرض المساحات
                      </Button>
                      {canEdit && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => navigate(`/investments/sites/${site.id}/edit`)}
                        >
                          <Pencil className="me-1 h-4 w-4" />
                          تعديل
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {loading && <p className="p-8 text-center text-sm text-muted-foreground">جارٍ تحميل المواقع...</p>}
          {!loading && !error && visibleSites.length === 0 && (
            <div className="p-10 text-center">
              <Building2 className="mx-auto mb-3 h-9 w-9 text-muted-foreground" />
              <p className="font-medium">لا توجد مواقع رئيسية مطابقة</p>
              <p className="mt-1 text-sm text-muted-foreground">يمكنك البدء بتسجيل أحد المواقع المرجعية أعلاه.</p>
            </div>
          )}
          {!!error && <p className="p-6 text-sm text-destructive">{error}</p>}
        </CardContent>
      </Card>
    </div>
  );
};
