import React from 'react';
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  FileUp,
  MapPinned,
  RefreshCw,
  Save,
  ShieldCheck,
  XCircle,
} from 'lucide-react';
import {
  MapContainer,
  Polygon,
  TileLayer,
  Tooltip,
  useMap,
} from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { useNavigate } from 'react-router';
import { toast } from 'sonner';
import { investmentsApi } from '../../features/investments/api';
import {
  parseGeometryCollectionFile,
  type ImportedGeometryItem,
} from '../../features/investments/geometryFiles';
import {
  getPolygonMetrics,
} from '../../features/investments/geometry';
import {
  runGisQualityAudit,
} from '../../features/investments/geometryAudit';
import { INVESTMENT_SITE_PRESETS } from '../../features/investments/sitePresets';
import type {
  GeometryAccuracy,
  InvestmentArea,
  InvestmentSite,
} from '../../features/investments/types';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { NativeSelect } from '../components/ui/native-select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../components/ui/table';

type MatchRow = {
  importIndex: number;
  sourceName: string;
  feature: ImportedGeometryItem['feature'];
  targetSiteId: string;
  autoMatched: boolean;
};

const DEFAULT_CENTER: [number, number] = [26.3927, 50.1906];

const normalize = (value: string) =>
  value
    .trim()
    .toUpperCase()
    .normalize('NFKD')
    .replace(/[\u064B-\u065F\u0670]/g, '')
    .replace(/[\s_–—-]+/g, '')
    .replace(/[^\p{L}\p{N}]/gu, '');

const presetAliases = new Map(
  INVESTMENT_SITE_PRESETS.map((preset) => [
    preset.code,
    [
      preset.code,
      preset.name,
      preset.name.replace('أرض ', ''),
      preset.name.replace('الحرم الجامعي ', 'الحرم '),
    ].map(normalize),
  ])
);

const findSiteMatch = (sourceName: string, sites: InvestmentSite[]) => {
  const source = normalize(sourceName);

  const exactCode = sites.find((site) => normalize(site.code) === source);
  if (exactCode) return exactCode;

  const exactName = sites.find((site) => normalize(site.name) === source);
  if (exactName) return exactName;

  for (const site of sites) {
    const siteCode = normalize(site.code);
    const siteName = normalize(site.name);
    const aliases = presetAliases.get(site.code) || [];

    if (
      source.includes(siteCode) ||
      source.includes(siteName) ||
      aliases.some((alias) => alias && source.includes(alias))
    ) {
      return site;
    }
  }

  return undefined;
};

const positionsFor = (feature: ImportedGeometryItem['feature']) =>
  getPolygonMetrics(feature).points.map(
    ([longitude, latitude]) => [latitude, longitude] as [number, number]
  );

const FitImportedSites: React.FC<{ rows: MatchRow[] }> = ({ rows }) => {
  const map = useMap();

  React.useEffect(() => {
    const points = rows.flatMap((row) => positionsFor(row.feature));

    if (!points.length) return;

    if (points.length === 1) {
      map.setView(points[0], 17);
      return;
    }

    map.fitBounds(points, {
      padding: [36, 36],
      maxZoom: 17,
    });
  }, [map, rows]);

  return null;
};

const formatArea = (value: number) =>
  value.toLocaleString('ar-SA', { maximumFractionDigits: 2 });

const accuracyLabels: Record<GeometryAccuracy, string> = {
  APPROXIMATE: 'تقريبية',
  FIELD_VERIFIED: 'متحقق منها ميدانيًا',
  SURVEYED: 'رفع مساحي',
  OFFICIAL: 'رسمية/معتمدة',
};

export const InvestmentSiteBoundaryImportPage: React.FC = () => {
  const navigate = useNavigate();
  const fileInputRef = React.useRef<HTMLInputElement | null>(null);

  const [sites, setSites] = React.useState<InvestmentSite[]>([]);
  const [areas, setAreas] = React.useState<InvestmentArea[]>([]);
  const [rows, setRows] = React.useState<MatchRow[]>([]);
  const [fileName, setFileName] = React.useState('');
  const [loading, setLoading] = React.useState(true);
  const [parsing, setParsing] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [layer, setLayer] = React.useState<'street' | 'satellite'>('satellite');
  const [accuracyMode, setAccuracyMode] = React.useState<'KEEP' | GeometryAccuracy>('KEEP');

  const loadData = React.useCallback(async () => {
    try {
      setLoading(true);

      const [firstSites, firstAreas] = await Promise.all([
        investmentsApi.getSites({ page: 1, limit: 100 }),
        investmentsApi.getAreas({ page: 1, limit: 100 }),
      ]);

      let allSites = [...firstSites.items];
      let allAreas = [...firstAreas.items];

      for (let page = 2; page <= firstSites.pagination.pages; page += 1) {
        const response = await investmentsApi.getSites({ page, limit: 100 });
        allSites = allSites.concat(response.items);
      }

      for (let page = 2; page <= firstAreas.pagination.pages; page += 1) {
        const response = await investmentsApi.getAreas({ page, limit: 100 });
        allAreas = allAreas.concat(response.items);
      }

      setSites(allSites);
      setAreas(allAreas);
    } catch (reason) {
      toast.error(
        reason instanceof Error
          ? reason.message
          : 'تعذر تحميل المواقع والمساحات الاستثمارية'
      );
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    loadData();
  }, [loadData]);

  const matchedRows = rows.filter((row) => row.targetSiteId);
  const unmatchedRows = rows.filter((row) => !row.targetSiteId);
  const assignedIds = matchedRows.map((row) => row.targetSiteId);
  const duplicateAssignments =
    assignedIds.length !== new Set(assignedIds).size;

  const siteById = React.useMemo(
    () => new Map(sites.map((site) => [site.id, site])),
    [sites]
  );

  const matchedSiteIds = React.useMemo(
    () => new Set(matchedRows.map((row) => row.targetSiteId).filter(Boolean)),
    [matchedRows]
  );

  const previewAreas = React.useMemo(
    () => areas.filter((area) => matchedSiteIds.has(area.siteId)),
    [areas, matchedSiteIds]
  );

  const prospectiveSites = React.useMemo(() => {
    const featureBySiteId = new Map(
      matchedRows.map((row) => [row.targetSiteId, row.feature])
    );

    return sites.map((site) => {
      const feature = featureBySiteId.get(site.id);
      if (!feature) return site;

      const metrics = getPolygonMetrics(feature);

      return {
        ...site,
        geoJson: feature,
        latitude: metrics.centroid?.latitude ?? site.latitude,
        longitude: metrics.centroid?.longitude ?? site.longitude,
        geometryAccuracy:
          accuracyMode === 'KEEP' ? site.geometryAccuracy : accuracyMode,
      };
    });
  }, [accuracyMode, matchedRows, sites]);

  const previewAudit = React.useMemo(
    () =>
      runGisQualityAudit(
        previewAreas,
        {
          warningPercent: 5,
          criticalPercent: 10,
        },
        prospectiveSites
      ),
    [previewAreas, prospectiveSites]
  );

  const outsideBySite = React.useMemo(() => {
    const counts = new Map<string, number>();

    for (const audit of previewAudit.areas) {
      if (
        audit.issues.some(
          (issue) => issue.code === 'OUTSIDE_SITE_BOUNDARY'
        )
      ) {
        counts.set(
          audit.area.siteId,
          (counts.get(audit.area.siteId) || 0) + 1
        );
      }
    }

    return counts;
  }, [previewAudit.areas]);

  const existingBoundaryReplacementCount = matchedRows.filter(
    (row) => Boolean(siteById.get(row.targetSiteId)?.geoJson)
  ).length;

  const totalImportedArea = rows.reduce(
    (sum, row) => sum + getPolygonMetrics(row.feature).calculatedAreaSqm,
    0
  );

  const resetFile = () => {
    setRows([]);
    setFileName('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleFile = async (file?: File) => {
    if (!file) return;

    try {
      setParsing(true);
      const imported = await parseGeometryCollectionFile(file);

      const nextRows = imported.map((item, index) => {
        const match = findSiteMatch(item.sourceName, sites);

        return {
          importIndex: index,
          sourceName: item.sourceName,
          feature: item.feature,
          targetSiteId: match?.id || '',
          autoMatched: Boolean(match),
        };
      });

      setRows(nextRows);
      setFileName(file.name);

      const autoMatched = nextRows.filter(
        (row) => row.targetSiteId
      ).length;

      toast.success(
        `تمت قراءة ${nextRows.length} حدود موقع، وطابق النظام ${autoMatched} منها تلقائيًا.`
      );
    } catch (reason) {
      resetFile();
      toast.error(
        reason instanceof Error
          ? reason.message
          : 'تعذر قراءة ملف حدود المواقع'
      );
    } finally {
      setParsing(false);
    }
  };

  const setTarget = (importIndex: number, targetSiteId: string) => {
    setRows((current) =>
      current.map((row) =>
        row.importIndex === importIndex
          ? {
              ...row,
              targetSiteId,
              autoMatched: false,
            }
          : row
      )
    );
  };

  const autoMatchAgain = () => {
    setRows((current) =>
      current.map((row) => {
        const match = findSiteMatch(row.sourceName, sites);

        return {
          ...row,
          targetSiteId: match?.id || '',
          autoMatched: Boolean(match),
        };
      })
    );
  };

  const handleSave = async () => {
    if (!rows.length) {
      toast.error('ارفع ملف GIS أولًا.');
      return;
    }

    if (unmatchedRows.length > 0) {
      toast.error('يجب مطابقة جميع الحدود مع المواقع الرئيسية قبل الاعتماد.');
      return;
    }

    if (duplicateAssignments) {
      toast.error('تم ربط أكثر من Polygon بالموقع نفسه. عدّل المطابقة أولًا.');
      return;
    }

    const confirmed = window.confirm(
      [
        'مراجعة نهائية قبل تحديث حدود المواقع الرئيسية:',
        `عدد الحدود: ${rows.length}`,
        `المطابقة المكتملة: ${matchedRows.length}`,
        `حدود محفوظة سيتم استبدالها: ${existingBoundaryReplacementCount}`,
        `مساحات يظهر أنها خارج حدود مواقعها بعد المعاينة: ${previewAudit.outsideSiteAreaCount}`,
        '',
        'سيتم تحديث GeoJSON والإحداثية المرجعية للمواقع المطابقة داخل عملية واحدة.',
        'لن يتم تعديل بيانات الصكوك أو مساحاتها.',
        '',
        'هل تريد المتابعة؟',
      ].join('\n')
    );

    if (!confirmed) return;

    try {
      setSaving(true);

      const payload = rows.map((row) => {
        const metrics = getPolygonMetrics(row.feature);

        if (!metrics.centroid) {
          throw new Error(`تعذر حساب مركز حدود الموقع: ${row.sourceName}`);
        }

        return {
          siteId: row.targetSiteId,
          geoJson: row.feature,
          latitude: metrics.centroid.latitude,
          longitude: metrics.centroid.longitude,
          ...(accuracyMode === 'KEEP'
            ? {}
            : { geometryAccuracy: accuracyMode }),
        };
      });

      const result = await investmentsApi.bulkUpdateSiteGeometry(payload);

      toast.success(
        `تم تحديث حدود ${result.updated} موقع رئيسي بنجاح. سيتم فتح تدقيق GIS الآن.`
      );

      navigate('/investments/gis-audit', { replace: true });
    } catch (reason) {
      toast.error(
        reason instanceof Error
          ? reason.message
          : 'تعذر اعتماد حدود المواقع الرئيسية'
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
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
            استيراد جماعي لحدود المواقع الرئيسية
          </h1>
          <p className="mt-2 text-sm leading-7 text-muted-foreground">
            ارفع ملف KML أو KMZ أو GeoJSON يحتوي على حدود المواقع الرئيسية،
            ثم راجع المطابقة والمعاينة ونتيجة احتواء المساحات قبل الاعتماد.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            accept=".geojson,.json,.kml,.kmz,application/geo+json,application/json,application/vnd.google-earth.kml+xml,application/vnd.google-earth.kmz"
            onChange={(event) => handleFile(event.target.files?.[0])}
          />

          <Button
            variant="outline"
            disabled={parsing || loading}
            onClick={() => fileInputRef.current?.click()}
          >
            <FileUp className="me-2 h-4 w-4" />
            {parsing ? 'جارٍ قراءة الملف...' : 'رفع ملف حدود المواقع'}
          </Button>

          {rows.length > 0 && (
            <Button
              variant="outline"
              onClick={resetFile}
              disabled={saving}
            >
              <XCircle className="me-2 h-4 w-4" />
              إلغاء الملف
            </Button>
          )}
        </div>
      </div>

      <Card className="border-sky-200 bg-sky-50/50">
        <CardContent className="p-4 text-sm leading-7 text-sky-950">
          <div className="flex items-start gap-3">
            <ShieldCheck className="mt-1 h-5 w-5 shrink-0" />
            <div>
              <p className="font-semibold">المطابقة الآلية</p>
              <p>
                يتعرف النظام على رموز المواقع المسجلة، وعلى الرموز المرجعية
                WEST وEAST وRAKA وRAYYAN وQASHLAH وأسمائها العربية. لا يتم إنشاء
                أي حدود من تلقاء النظام؛ الملف المرفوع هو مصدر الـPolygon.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">حدود في الملف</CardTitle>
          </CardHeader>
          <CardContent className="text-3xl font-bold">
            {rows.length}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">مطابقة مكتملة</CardTitle>
          </CardHeader>
          <CardContent className="text-3xl font-bold">
            {matchedRows.length}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">تحتاج مراجعة</CardTitle>
          </CardHeader>
          <CardContent className="text-3xl font-bold">
            {unmatchedRows.length}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">ستستبدل حدودًا محفوظة</CardTitle>
          </CardHeader>
          <CardContent className="text-3xl font-bold">
            {existingBoundaryReplacementCount}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">خارج النطاق بعد المعاينة</CardTitle>
          </CardHeader>
          <CardContent className="text-3xl font-bold">
            {previewAudit.outsideSiteAreaCount}
          </CardContent>
        </Card>
      </div>

      {rows.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <MapPinned className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
            <p className="font-semibold">لم يتم رفع ملف حدود المواقع بعد</p>
            <p className="mt-2 text-sm leading-7 text-muted-foreground">
              للحصول على مطابقة تلقائية دقيقة، استخدم رمز الموقع مثل WEST أو
              EAST أو RAKA أو RAYYAN أو QASHLAH كاسم Feature أو Placemark.
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          <Card>
            <CardHeader>
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <CardTitle className="text-base">
                    معاينة حدود المواقع المستوردة
                  </CardTitle>
                  <p className="mt-1 text-xs text-muted-foreground">
                    الملف: {fileName} — إجمالي المساحة الهندسية{' '}
                    {formatArea(totalImportedArea)} م²
                  </p>
                </div>

                <div className="flex flex-wrap items-end gap-2">
                  <div className="min-w-[220px]">
                    <p className="mb-1 text-xs text-muted-foreground">
                      دقة الحدود بعد الاستيراد
                    </p>
                    <NativeSelect
                      value={accuracyMode}
                      onChange={(event) =>
                        setAccuracyMode(
                          event.target.value as 'KEEP' | GeometryAccuracy
                        )
                      }
                    >
                      <option value="KEEP">الحفاظ على الدقة الحالية</option>
                      {Object.entries(accuracyLabels).map(([value, label]) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      ))}
                    </NativeSelect>
                  </div>

                  <Button
                    size="sm"
                    variant={layer === 'street' ? 'default' : 'outline'}
                    onClick={() => setLayer('street')}
                  >
                    خريطة
                  </Button>
                  <Button
                    size="sm"
                    variant={layer === 'satellite' ? 'default' : 'outline'}
                    onClick={() => setLayer('satellite')}
                  >
                    قمر صناعي
                  </Button>
                </div>
              </div>
            </CardHeader>

            <CardContent className="p-0">
              <div className="h-[520px] w-full border-t">
                <MapContainer
                  center={DEFAULT_CENTER}
                  zoom={12}
                  scrollWheelZoom
                  style={{ height: '100%', width: '100%' }}
                >
                  {layer === 'street' ? (
                    <TileLayer
                      attribution="&copy; OpenStreetMap contributors"
                      url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    />
                  ) : (
                    <TileLayer
                      attribution="Tiles &copy; Esri"
                      url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
                    />
                  )}

                  <FitImportedSites rows={rows} />

                  {rows.map((row) => {
                    const matched = Boolean(row.targetSiteId);
                    const outsideCount =
                      outsideBySite.get(row.targetSiteId) || 0;

                    return (
                      <Polygon
                        key={row.importIndex}
                        positions={positionsFor(row.feature)}
                        pathOptions={{
                          color: !matched
                            ? '#ea580c'
                            : outsideCount > 0
                              ? '#dc2626'
                              : '#16a34a',
                          fillColor: !matched
                            ? '#f97316'
                            : outsideCount > 0
                              ? '#ef4444'
                              : '#22c55e',
                          fillOpacity: 0.18,
                          weight: 3,
                        }}
                      >
                        <Tooltip sticky>
                          <div dir="rtl" className="text-right">
                            <div className="font-semibold">
                              {row.sourceName}
                            </div>
                            <div className="mt-1 text-xs">
                              {matched
                                ? siteById.get(row.targetSiteId)?.name
                                : 'غير مطابق'}
                            </div>
                            {matched && (
                              <div className="mt-1 text-xs">
                                مساحات خارج النطاق: {outsideCount}
                              </div>
                            )}
                          </div>
                        </Tooltip>
                      </Polygon>
                    );
                  })}
                </MapContainer>
              </div>
            </CardContent>
          </Card>

          {duplicateAssignments && (
            <Card className="border-destructive/40 bg-destructive/5">
              <CardContent className="flex items-start gap-3 p-4 text-sm">
                <AlertTriangle className="mt-0.5 h-5 w-5 text-destructive" />
                <div>
                  <p className="font-semibold">يوجد تكرار في المطابقة</p>
                  <p className="mt-1 text-muted-foreground">
                    لا يمكن ربط أكثر من Polygon بالموقع الرئيسي نفسه في عملية
                    الاستيراد الجماعي الحالية.
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
                    مطابقة الحدود مع المواقع الرئيسية
                  </CardTitle>
                  <p className="mt-1 text-xs leading-6 text-muted-foreground">
                    راجع المطابقة وعدد المساحات التابعة التي تظهر خارج الحدود
                    الجديدة قبل الاعتماد.
                  </p>
                </div>

                <Button variant="outline" onClick={autoMatchAgain}>
                  <RefreshCw className="me-2 h-4 w-4" />
                  إعادة المطابقة التلقائية
                </Button>
              </div>
            </CardHeader>

            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>#</TableHead>
                    <TableHead>اسم العنصر في الملف</TableHead>
                    <TableHead>المساحة الهندسية</TableHead>
                    <TableHead>الموقع الرئيسي</TableHead>
                    <TableHead>المساحات التابعة</TableHead>
                    <TableHead>خارج الحدود</TableHead>
                    <TableHead>الحالة</TableHead>
                  </TableRow>
                </TableHeader>

                <TableBody>
                  {rows.map((row) => {
                    const metrics = getPolygonMetrics(row.feature);
                    const site = siteById.get(row.targetSiteId);
                    const childCount = site?._count?.areas ??
                      areas.filter((area) => area.siteId === row.targetSiteId).length;
                    const outsideCount =
                      outsideBySite.get(row.targetSiteId) || 0;
                    const replacing = Boolean(site?.geoJson);

                    return (
                      <TableRow key={row.importIndex}>
                        <TableCell>{row.importIndex + 1}</TableCell>

                        <TableCell>
                          <div className="font-semibold">
                            {row.sourceName}
                          </div>
                          <div className="mt-1 text-xs text-muted-foreground">
                            {metrics.vertexCount} نقاط
                          </div>
                        </TableCell>

                        <TableCell>
                          {formatArea(metrics.calculatedAreaSqm)} م²
                        </TableCell>

                        <TableCell className="min-w-[300px]">
                          <NativeSelect
                            value={row.targetSiteId}
                            onChange={(event) =>
                              setTarget(
                                row.importIndex,
                                event.target.value
                              )
                            }
                          >
                            <option value="">— اختر الموقع —</option>
                            {sites.map((candidate) => (
                              <option key={candidate.id} value={candidate.id}>
                                {candidate.code} — {candidate.name}
                              </option>
                            ))}
                          </NativeSelect>
                        </TableCell>

                        <TableCell>{site ? childCount : '-'}</TableCell>

                        <TableCell>
                          {!site ? (
                            '-'
                          ) : outsideCount > 0 ? (
                            <Badge variant="destructive">
                              {outsideCount}
                            </Badge>
                          ) : (
                            <Badge variant="secondary">0</Badge>
                          )}
                        </TableCell>

                        <TableCell>
                          {!row.targetSiteId ? (
                            <Badge variant="outline">يحتاج مطابقة</Badge>
                          ) : replacing ? (
                            <Badge variant="outline">
                              سيستبدل حدودًا محفوظة
                            </Badge>
                          ) : row.autoMatched ? (
                            <Badge variant="secondary">
                              مطابق تلقائيًا
                            </Badge>
                          ) : (
                            <Badge>مطابق يدويًا</Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="flex flex-col gap-4 p-5 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex items-start gap-3">
                {unmatchedRows.length === 0 &&
                !duplicateAssignments &&
                previewAudit.outsideSiteAreaCount === 0 ? (
                  <CheckCircle2 className="mt-1 h-6 w-6 text-emerald-600" />
                ) : (
                  <ShieldCheck className="mt-1 h-6 w-6 text-primary" />
                )}

                <div>
                  <p className="font-semibold">
                    اعتماد حدود المواقع الرئيسية
                  </p>
                  <p className="mt-1 text-sm leading-7 text-muted-foreground">
                    بعد الحفظ ينتقل النظام تلقائيًا إلى شاشة تدقيق GIS لتشغيل
                    فحص الاحتواء على البيانات المحفوظة.
                  </p>

                  {previewAudit.outsideSiteAreaCount > 0 && (
                    <p className="mt-1 text-xs text-red-700">
                      المعاينة الحالية ترصد{' '}
                      {previewAudit.outsideSiteAreaCount} مساحة خارج حدود
                      موقعها المقترحة. يمكن الحفظ، لكن ستظهر كملاحظات حرجة في
                      شاشة التدقيق.
                    </p>
                  )}
                </div>
              </div>

              <Button
                size="lg"
                disabled={
                  saving ||
                  rows.length === 0 ||
                  unmatchedRows.length > 0 ||
                  duplicateAssignments
                }
                onClick={handleSave}
              >
                <Save className="me-2 h-5 w-5" />
                {saving
                  ? 'جارٍ اعتماد الحدود...'
                  : `اعتماد حدود ${rows.length} موقع`}
              </Button>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
};
