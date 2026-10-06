import React from 'react';
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  FileCheck2,
  MapPin,
  RefreshCw,
  ShieldCheck,
} from 'lucide-react';
import { useNavigate } from 'react-router';
import { toast } from 'sonner';
import { investmentsApi } from '../../features/investments/api';
import {
  getInvestmentAreaPresets,
  TOTAL_PRESET_AREAS,
} from '../../features/investments/areaPresets';
import { INVESTMENT_SITE_PRESETS } from '../../features/investments/sitePresets';
import type {
  InvestmentArea,
  InvestmentSite,
} from '../../features/investments/types';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../components/ui/table';

type AreaMap = Record<string, InvestmentArea[]>;

const numberFormatter = new Intl.NumberFormat('ar-SA', {
  maximumFractionDigits: 2,
});

const getSiteDeeds = (site?: InvestmentSite) => {
  if (!site) return [];

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

const areaTotal = (siteCode: string) =>
  getInvestmentAreaPresets(siteCode).reduce(
    (sum, area) => sum + Number(area.approximateArea || 0),
    0
  );

export const InvestmentReferenceImportReviewPage: React.FC = () => {
  const navigate = useNavigate();
  const [sites, setSites] = React.useState<InvestmentSite[]>([]);
  const [areasBySiteId, setAreasBySiteId] = React.useState<AreaMap>({});
  const [loading, setLoading] = React.useState(true);
  const [importing, setImporting] = React.useState(false);
  const [error, setError] = React.useState('');
  const [lastResult, setLastResult] = React.useState<{
    requested: number;
    created: number;
    skipped: number;
  } | null>(null);

  const load = React.useCallback(async () => {
    try {
      setLoading(true);
      setError('');

      const siteResponse = await investmentsApi.getSites({ limit: 100 });
      const referenceSites = siteResponse.items.filter((site) =>
        INVESTMENT_SITE_PRESETS.some(
          (preset) => preset.code === site.code.toUpperCase()
        )
      );

      const areaEntries = await Promise.all(
        referenceSites.map(async (site) => {
          const response = await investmentsApi.getAreas({
            siteId: site.id,
            limit: 100,
          });
          return [site.id, response.items] as const;
        })
      );

      setSites(siteResponse.items);
      setAreasBySiteId(Object.fromEntries(areaEntries));
    } catch (reason) {
      const message =
        reason instanceof Error
          ? reason.message
          : 'تعذر تحميل مراجعة المساحات الاستثمارية';
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    load();
  }, [load]);

  const sitesByCode = React.useMemo(
    () =>
      new Map(
        sites.map((site) => [site.code.toUpperCase(), site] as const)
      ),
    [sites]
  );

  const rows = React.useMemo(
    () =>
      INVESTMENT_SITE_PRESETS.map((preset) => {
        const site = sitesByCode.get(preset.code);
        const sourceAreas = getInvestmentAreaPresets(preset.code);
        const existingAreas = site ? areasBySiteId[site.id] || [] : [];
        const existingCodes = new Set(
          existingAreas.map((area) => area.areaCode.toUpperCase())
        );
        const linkedDeedNumbers = getSiteDeeds(site).map((deed) =>
          String(deed.deedNumber || '').trim()
        );
        const missingDeeds = preset.deedNumbers.filter(
          (deedNumber) => !linkedDeedNumbers.includes(deedNumber)
        );
        const existingReferenceAreas = sourceAreas.filter((area) =>
          existingCodes.has(area.areaCode.toUpperCase())
        ).length;
        const pendingReferenceAreas =
          sourceAreas.length - existingReferenceAreas;

        return {
          preset,
          site,
          sourceAreas,
          linkedDeedNumbers,
          missingDeeds,
          existingReferenceAreas,
          pendingReferenceAreas,
          totalArea: areaTotal(preset.code),
          ready: Boolean(site) && missingDeeds.length === 0,
        };
      }),
    [areasBySiteId, sitesByCode]
  );

  const sourceTotalArea = React.useMemo(
    () => rows.reduce((sum, row) => sum + row.totalArea, 0),
    [rows]
  );

  const readySites = rows.filter((row) => row.ready).length;
  const currentReferenceAreas = rows.reduce(
    (sum, row) => sum + row.existingReferenceAreas,
    0
  );
  const pendingReferenceAreas = TOTAL_PRESET_AREAS - currentReferenceAreas;
  const allReady = rows.every((row) => row.ready);
  const allComplete = pendingReferenceAreas === 0;

  const handleApproveImport = async () => {
    if (!allReady) {
      toast.error(
        'لا يمكن تنفيذ الاستيراد قبل تسجيل المواقع الخمسة واستكمال ربط الصكوك المرجعية.'
      );
      return;
    }

    if (allComplete) {
      toast.info('جميع المساحات المرجعية الـ28 مسجلة بالفعل.');
      return;
    }

    const confirmed = window.confirm(
      [
        'مراجعة نهائية قبل الاعتماد:',
        `المواقع الرئيسية: ${rows.length}`,
        `المساحات المرجعية: ${TOTAL_PRESET_AREAS}`,
        `المساحات المسجلة حاليًا: ${currentReferenceAreas}`,
        `المساحات التي سيحاول النظام استكمالها: ${pendingReferenceAreas}`,
        `إجمالي المساحات التقريبية في البيان: ${numberFormatter.format(sourceTotalArea)} م²`,
        '',
        'لن يتم استبدال أي سجل موجود مسبقًا. هل تريد اعتماد الاستيراد؟',
      ].join('\n')
    );

    if (!confirmed) return;

    try {
      setImporting(true);
      setLastResult(null);

      const result = await investmentsApi.bulkImportAreaBatches(
        rows.map((row) => ({
          siteId: row.site!.id,
          areas: row.sourceAreas,
        }))
      );

      setLastResult({
        requested: result.requested,
        created: result.created,
        skipped: result.skipped,
      });

      await load();

      if (result.created > 0) {
        toast.success(
          `تم اعتماد الاستيراد: أُنشئت ${result.created} مساحة، وتم تجاوز ${result.skipped} مساحة موجودة مسبقًا.`
        );
      } else {
        toast.info('جميع المساحات المرجعية كانت مسجلة مسبقًا.');
      }
    } catch (reason) {
      toast.error(
        reason instanceof Error
          ? reason.message
          : 'تعذر تنفيذ الاستيراد الجماعي للمساحات'
      );
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <Button
          variant="ghost"
          className="mb-2 px-0"
          onClick={() => navigate('/investments/sites')}
        >
          <ArrowRight className="me-2 h-4 w-4" />
          المواقع الاستثمارية الرئيسية
        </Button>

        <h1 className="text-2xl font-bold">
          المراجعة النهائية لبيان الأراضي الشاغرة
        </h1>
        <p className="mt-2 text-sm leading-7 text-muted-foreground">
          مراجعة المواقع الخمسة والصكوك المرتبطة والمساحات المرجعية قبل
          اعتماد استيراد المساحات الـ28 إلى المنصة.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">المواقع المرجعية</CardTitle>
          </CardHeader>
          <CardContent className="text-3xl font-bold">
            {readySites}/{rows.length}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">المساحات المرجعية</CardTitle>
          </CardHeader>
          <CardContent className="text-3xl font-bold">
            {TOTAL_PRESET_AREAS}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">المسجل حاليًا</CardTitle>
          </CardHeader>
          <CardContent className="text-3xl font-bold">
            {currentReferenceAreas}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">الإجمالي التقريبي</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {numberFormatter.format(sourceTotalArea)}
            </div>
            <div className="mt-1 text-xs text-muted-foreground">م²</div>
          </CardContent>
        </Card>
      </div>

      {lastResult && (
        <Card className="border-emerald-200 bg-emerald-50/60">
          <CardContent className="flex flex-wrap items-center gap-3 p-4 text-sm">
            <CheckCircle2 className="h-5 w-5 text-emerald-700" />
            <span className="font-semibold">آخر عملية اعتماد:</span>
            <span>المطلوب {lastResult.requested}</span>
            <span>تم إنشاؤه {lastResult.created}</span>
            <span>تم تجاوزه {lastResult.skipped}</span>
          </CardContent>
        </Card>
      )}

      {!loading && !error && !allReady && (
        <Card className="border-amber-200 bg-amber-50/60">
          <CardContent className="flex items-start gap-3 p-4 text-sm leading-7">
            <AlertTriangle className="mt-1 h-5 w-5 shrink-0 text-amber-700" />
            <div>
              <p className="font-semibold">الاعتماد غير متاح حاليًا.</p>
              <p>
                يجب أن تكون المواقع الخمسة مسجلة، وأن تكون جميع أرقام الصكوك
                المرجعية مرتبطة بالموقع الصحيح قبل استيراد المساحات.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <CardTitle className="text-base">
                تفاصيل المراجعة قبل الاستيراد
              </CardTitle>
              <p className="mt-1 text-xs leading-6 text-muted-foreground">
                المساحات والإحداثيات المرجعية بيانات تقريبية من البيان، ولا
                تحل محل الرفع المساحي أو حدود الصك الرسمية.
              </p>
            </div>

            <Button
              variant="outline"
              onClick={load}
              disabled={loading || importing}
            >
              <RefreshCw className="me-2 h-4 w-4" />
              تحديث المراجعة
            </Button>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>الموقع الرئيسي</TableHead>
                <TableHead>الصكوك المرجعية</TableHead>
                <TableHead>المساحات</TableHead>
                <TableHead>إجمالي المساحة التقريبية</TableHead>
                <TableHead>الحالة</TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {rows.map((row) => (
                <TableRow key={row.preset.code}>
                  <TableCell>
                    <div className="font-semibold">{row.preset.name}</div>
                    <div
                      className="mt-1 text-xs text-muted-foreground"
                      dir="ltr"
                    >
                      {row.preset.code}
                    </div>
                  </TableCell>

                  <TableCell>
                    <div className="space-y-1">
                      {row.preset.deedNumbers.map((deedNumber) => {
                        const linked =
                          row.linkedDeedNumbers.includes(deedNumber);

                        return (
                          <div
                            key={deedNumber}
                            className="flex items-center gap-2 text-sm"
                          >
                            {linked ? (
                              <FileCheck2 className="h-4 w-4 text-emerald-600" />
                            ) : (
                              <AlertTriangle className="h-4 w-4 text-amber-600" />
                            )}
                            <span dir="ltr">{deedNumber}</span>
                          </div>
                        );
                      })}
                    </div>
                  </TableCell>

                  <TableCell>
                    <div className="text-sm">
                      {row.existingReferenceAreas}/{row.sourceAreas.length}
                    </div>
                    <div className="mt-1 text-xs text-muted-foreground">
                      {row.pendingReferenceAreas > 0
                        ? `متبقي ${row.pendingReferenceAreas}`
                        : 'مكتملة'}
                    </div>
                  </TableCell>

                  <TableCell>
                    {numberFormatter.format(row.totalArea)} م²
                  </TableCell>

                  <TableCell>
                    {!row.site ? (
                      <Badge variant="outline">الموقع غير مسجل</Badge>
                    ) : row.missingDeeds.length > 0 ? (
                      <Badge variant="outline">ربط الصكوك غير مكتمل</Badge>
                    ) : row.pendingReferenceAreas === 0 ? (
                      <Badge variant="secondary">المساحات مكتملة</Badge>
                    ) : (
                      <Badge>جاهز للاستيراد</Badge>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {loading && (
            <p className="p-8 text-center text-sm text-muted-foreground">
              جارٍ إعداد المراجعة النهائية...
            </p>
          )}

          {!!error && (
            <p className="p-6 text-sm text-destructive">{error}</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="flex flex-col gap-4 p-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-3">
            <ShieldCheck className="mt-1 h-6 w-6 text-primary" />
            <div>
              <p className="font-semibold">اعتماد واحد للمساحات المرجعية</p>
              <p className="mt-1 text-sm leading-7 text-muted-foreground">
                ينفذ النظام عملية جماعية واحدة لجميع المواقع، مع تجاوز
                السجلات الموجودة مسبقًا دون تعديلها أو استبدالها.
              </p>
            </div>
          </div>

          <Button
            size="lg"
            onClick={handleApproveImport}
            disabled={
              loading ||
              importing ||
              !allReady ||
              allComplete ||
              Boolean(error)
            }
          >
            <MapPin className="me-2 h-5 w-5" />
            {importing
              ? 'جارٍ اعتماد واستيراد المساحات...'
              : allComplete
                ? 'المساحات الـ28 مكتملة'
                : `اعتماد واستيراد ${pendingReferenceAreas} مساحة`}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};
