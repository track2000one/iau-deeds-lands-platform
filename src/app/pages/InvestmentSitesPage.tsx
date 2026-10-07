import React from 'react';
import { ArrowRight, Building2, FileText, FileUp, FolderPlus, MapPin, Pencil, Search, ShieldCheck } from 'lucide-react';
import { useNavigate } from 'react-router';
import { toast } from 'sonner';
import { usePermissions } from '../../context/PermissionsContext';
import { investmentsApi } from '../../features/investments/api';
import { INVESTMENT_SITE_PRESETS } from '../../features/investments/sitePresets';
import { getInvestmentAreaPresets } from '../../features/investments/areaPresets';
import type { InvestmentDeedOption, InvestmentSite } from '../../features/investments/types';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Input } from '../components/ui/input';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '../components/ui/table';

const getSiteDeeds = (site: InvestmentSite) => {
  const deeds = [
    ...(site.deed ? [site.deed] : []),
    ...(site.deedLinks || []).map((link) => link.deed),
  ];

  const seen = new Set<string>();
  return deeds.filter((deed) => {
    if (!deed || seen.has(deed.id)) return false;
    seen.add(deed.id);
    return true;
  });
};

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
  const [registeringCode, setRegisteringCode] = React.useState<string | null>(null);
  const [registeringAll, setRegisteringAll] = React.useState(false);
  const [matchingDeeds, setMatchingDeeds] = React.useState(true);
  const [matchError, setMatchError] = React.useState('');
  const [deedMatches, setDeedMatches] = React.useState<Record<string, InvestmentDeedOption | null>>({});

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

  React.useEffect(() => {
    let cancelled = false;

    const matchReferenceDeeds = async () => {
      const referenceNumbers = Array.from(
        new Set(INVESTMENT_SITE_PRESETS.flatMap((preset) => preset.deedNumbers))
      );

      try {
        setMatchingDeeds(true);
        setMatchError('');

        const entries = await Promise.all(
          referenceNumbers.map(async (deedNumber) => {
            const { items } = await investmentsApi.getDeedOptions(deedNumber);
            const exact =
              items.find(
                (item) =>
                  String(item.deedNumber || '').trim() === deedNumber
              ) || null;

            return [deedNumber, exact] as const;
          })
        );

        if (!cancelled) {
          setDeedMatches(Object.fromEntries(entries));
        }
      } catch (reason) {
        if (!cancelled) {
          setMatchError(
            reason instanceof Error ? reason.message : 'تعذر مطابقة الصكوك المرجعية'
          );
        }
      } finally {
        if (!cancelled) setMatchingDeeds(false);
      }
    };

    matchReferenceDeeds();

    return () => {
      cancelled = true;
    };
  }, []);

  const visibleSites = sites.filter((site) => {
    const deedNumbers = getSiteDeeds(site).map((deed) => deed.deedNumber);
    return [site.name, site.code, ...deedNumbers]
      .some((value) => value.toLowerCase().includes(search.trim().toLowerCase()));
  });
  const linked = sites.filter((site) => getSiteDeeds(site).length > 0).length;
  const areasCount = sites.reduce((sum, site) => sum + (site._count?.areas || 0), 0);
  const knownCodes = new Set(sites.map((site) => site.code.toUpperCase()));
  const sitesByCode = new Map(sites.map((site) => [site.code.toUpperCase(), site]));

  const getPresetMatches = (deedNumbers: string[]) =>
    deedNumbers
      .map((deedNumber) => deedMatches[deedNumber])
      .filter((deed): deed is InvestmentDeedOption => Boolean(deed));

  const refreshSites = async () => {
    const response = await investmentsApi.getSites({ limit: 100 });
    setSites(response.items);
  };

  const registerPreset = async (preset: typeof INVESTMENT_SITE_PRESETS[number]) => {
    const matchedDeeds = getPresetMatches(preset.deedNumbers);

    if (matchedDeeds.length !== preset.deedNumbers.length) {
      toast.error('لم تكتمل مطابقة جميع الصكوك المرجعية لهذا الموقع.');
      return false;
    }

    try {
      setRegisteringCode(preset.code);

      await investmentsApi.createSite({
        code: preset.code,
        name: preset.name,
        description:
          'موقع رئيسي جرى تجهيزه استنادًا إلى بيان الأراضي الشاغرة، بعد مطابقة أرقام الصكوك المرجعية مع سجل الصكوك في المنصة.',
        region: 'المنطقة الشرقية',
        city: 'الدمام',
        district: null,
        latitude: preset.latitude ?? null,
        longitude: preset.longitude ?? null,
        deedId: matchedDeeds[0]?.id || null,
        deedIds: matchedDeeds.map((deed) => deed.id),
      });

      toast.success(`تم تسجيل ${preset.name} وربطه بالصكوك المطابقة.`);
      await refreshSites();
      return true;
    } catch (reason) {
      toast.error(
        reason instanceof Error ? reason.message : 'تعذر تسجيل الموقع المرجعي'
      );
      return false;
    } finally {
      setRegisteringCode(null);
    }
  };

  const handleRegisterAllMatched = async () => {
    const pending = INVESTMENT_SITE_PRESETS.filter(
      (preset) =>
        !knownCodes.has(preset.code) &&
        getPresetMatches(preset.deedNumbers).length === preset.deedNumbers.length
    );

    if (!pending.length) {
      toast.info('لا توجد مواقع مكتملة المطابقة بانتظار التسجيل.');
      return;
    }

    const confirmed = window.confirm(
      `سيتم تسجيل ${pending.length} مواقع رئيسية وربطها بالصكوك المطابقة فقط. لن يتم استيراد المساحات في هذه الخطوة. هل تريد المتابعة؟`
    );

    if (!confirmed) return;

    try {
      setRegisteringAll(true);
      let created = 0;

      for (const preset of pending) {
        const matchedDeeds = getPresetMatches(preset.deedNumbers);

        try {
          await investmentsApi.createSite({
            code: preset.code,
            name: preset.name,
            description:
              'موقع رئيسي جرى تجهيزه استنادًا إلى بيان الأراضي الشاغرة، بعد مطابقة أرقام الصكوك المرجعية مع سجل الصكوك في المنصة.',
            region: 'المنطقة الشرقية',
            city: 'الدمام',
            district: null,
            latitude: preset.latitude ?? null,
            longitude: preset.longitude ?? null,
            deedId: matchedDeeds[0]?.id || null,
            deedIds: matchedDeeds.map((deed) => deed.id),
          });
          created += 1;
        } catch (reason) {
          console.error('Reference site registration failed:', preset.code, reason);
        }
      }

      await refreshSites();

      if (created === pending.length) {
        toast.success(`تم تسجيل وربط ${created} مواقع رئيسية بنجاح.`);
      } else {
        toast.info(`تم تسجيل ${created} من أصل ${pending.length} مواقع. راجع المواقع غير المسجلة.`);
      }
    } finally {
      setRegisteringAll(false);
    }
  };

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
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            onClick={() => navigate('/investments/map')}
          >
            <MapPin className="me-2 h-4 w-4" />
            الخريطة الاستثمارية
          </Button>
          {canEdit && (
            <Button
              variant="outline"
              onClick={() => navigate('/investments/site-boundary-import')}
            >
              <FileUp className="me-2 h-4 w-4" />
              استيراد حدود المواقع
            </Button>
          )}
          {canAdd && (
            <Button
              variant="outline"
              onClick={() => navigate('/investments/reference-import-review')}
            >
              <ShieldCheck className="me-2 h-4 w-4" />
              المراجعة النهائية واستيراد الـ28
            </Button>
          )}
          {canAdd && !matchingDeeds && !matchError && (
            <Button
              variant="outline"
              onClick={handleRegisterAllMatched}
              disabled={registeringAll}
            >
              <FileText className="me-2 h-4 w-4" />
              {registeringAll ? 'جارٍ تسجيل المواقع...' : 'تسجيل المواقع المطابقة'}
            </Button>
          )}
          {canAdd && (
            <Button onClick={() => navigate('/investments/sites/new')}>
              <FolderPlus className="me-2 h-4 w-4" />
              إضافة موقع رئيسي
            </Button>
          )}
        </div>
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
            تتم مطابقة أرقام الصكوك المرجعية مباشرة مع سجل الصكوك في المنصة. لا يتم إنشاء الموقع إلا عند وجود مطابقة رقمية تامة لكل صك مرجعي.
          </p>
          <div className="mt-2">
            {matchingDeeds ? (
              <Badge variant="outline">جارٍ مطابقة الصكوك المرجعية...</Badge>
            ) : matchError ? (
              <Badge variant="destructive">تعذر تنفيذ المطابقة</Badge>
            ) : (
              <Badge variant="secondary">
                تم العثور على {Object.values(deedMatches).filter(Boolean).length} من {Object.keys(deedMatches).length} صكوك مرجعية
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {INVESTMENT_SITE_PRESETS.map((preset) => {
            const registered = knownCodes.has(preset.code);
            const matchedDeeds = getPresetMatches(preset.deedNumbers);
            const matchComplete =
              !matchingDeeds &&
              !matchError &&
              matchedDeeds.length === preset.deedNumbers.length;

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
                  <div>
                    <span className="block text-sm text-muted-foreground">
                      {preset.expectedAreas} مساحات وفق البيان
                    </span>
                    <span className="mt-1 block text-xs text-muted-foreground" dir="ltr">
                      الصكوك المرجعية: {preset.deedNumbers.join(' / ')}
                    </span>
                    <span className="mt-1 block text-xs">
                      {matchingDeeds
                        ? 'جارٍ التحقق من السجل...'
                        : matchError
                          ? 'تعذر التحقق'
                          : matchComplete
                            ? `مطابقة مكتملة (${matchedDeeds.length}/${preset.deedNumbers.length})`
                            : `مطابقة غير مكتملة (${matchedDeeds.length}/${preset.deedNumbers.length})`}
                    </span>
                  </div>
                  {canAdd && !registered && !loading && !error && (
                    matchComplete ? (
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={registeringCode === preset.code || registeringAll}
                        onClick={() => registerPreset(preset)}
                      >
                        {registeringCode === preset.code ? 'جارٍ التسجيل...' : 'تسجيل وربط'}
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => navigate(`/investments/sites/new?preset=${preset.code}`)}
                      >
                        مراجعة يدويًا
                      </Button>
                    )
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
                    {getSiteDeeds(site).length > 0 ? (
                      <div className="flex flex-col gap-1">
                        {getSiteDeeds(site).map((deed, index) => (
                          <span key={deed.id} className="inline-flex items-center gap-2">
                            <FileText className="h-4 w-4" />
                            <span dir="ltr">{deed.deedNumber}</span>
                            {index === 0 && getSiteDeeds(site).length > 1 && (
                              <Badge variant="outline">رئيسي</Badge>
                            )}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <Badge variant="outline">بانتظار الربط</Badge>
                    )}
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
