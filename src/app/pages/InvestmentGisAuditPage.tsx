import React from 'react';
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  CircleAlert,
  FileUp,
  ListChecks,
  MapPin,
  RefreshCw,
  Search,
  ShieldCheck,
  TriangleAlert,
} from 'lucide-react';
import {
  CircleMarker,
  GeoJSON,
  MapContainer,
  Popup,
  TileLayer,
  useMap,
} from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { useNavigate } from 'react-router';
import { toast } from 'sonner';
import { investmentsApi } from '../../features/investments/api';
import { usePermissions } from '../../context/PermissionsContext';
import {
  runGisQualityAudit,
  type GisAuditIssueCode,
  type GisAuditSeverity,
} from '../../features/investments/geometryAudit';
import { getPolygonMetrics } from '../../features/investments/geometry';
import type {
  InvestmentArea,
  InvestmentSite,
} from '../../features/investments/types';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { NativeSelect } from '../components/ui/native-select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../components/ui/table';

const DEFAULT_CENTER: [number, number] = [26.3927, 50.1906];

const severityLabels: Record<GisAuditSeverity, string> = {
  CRITICAL: 'حرجة',
  WARNING: 'تنبيه',
  INFO: 'معلومة',
};

const issueLabels: Record<GisAuditIssueCode, string> = {
  MISSING_POLYGON: 'حدود غير موجودة',
  INVALID_POLYGON: 'Polygon غير صالح',
  SELF_INTERSECTION: 'تقاطع ذاتي',
  AREA_VARIANCE: 'فرق مساحة',
  MISSING_SURVEYED_AREA: 'مساحة مساحية ناقصة',
  MISSING_REFERENCE_POINT: 'إحداثية ناقصة',
  POLYGON_OVERLAP: 'تداخل حدود',
  MISSING_SITE_BOUNDARY: 'حدود الموقع الرئيسي مفقودة',
  INVALID_SITE_BOUNDARY: 'حدود الموقع الرئيسي غير صالحة',
  SITE_BOUNDARY_SELF_INTERSECTION: 'تقاطع ذاتي في حدود الموقع',
  OUTSIDE_SITE_BOUNDARY: 'خارج حدود الموقع الرئيسي',
};

const severityColors: Record<GisAuditSeverity, string> = {
  CRITICAL: '#dc2626',
  WARNING: '#d97706',
  INFO: '#2563eb',
};

const finitePoint = (
  area: InvestmentArea
): [number, number] | null => {
  const latitude = Number(area.latitude);
  const longitude = Number(area.longitude);

  if (
    !Number.isFinite(latitude) ||
    !Number.isFinite(longitude) ||
    latitude < -90 ||
    latitude > 90 ||
    longitude < -180 ||
    longitude > 180
  ) {
    return null;
  }

  return [latitude, longitude];
};

const FitAuditMap: React.FC<{
  areas: InvestmentArea[];
  sites: InvestmentSite[];
}> = ({ areas, sites }) => {
  const map = useMap();

  React.useEffect(() => {
    const points: [number, number][] = [];

    for (const site of sites) {
      const metrics = getPolygonMetrics(site.geoJson);
      if (!metrics.isValid) continue;

      for (const [longitude, latitude] of metrics.points) {
        points.push([latitude, longitude]);
      }
    }

    for (const area of areas) {
      const metrics = getPolygonMetrics(area.geoJson);

      if (metrics.isValid) {
        for (const [longitude, latitude] of metrics.points) {
          points.push([latitude, longitude]);
        }
      } else {
        const point = finitePoint(area);
        if (point) points.push(point);
      }
    }

    if (!points.length) return;

    if (points.length === 1) {
      map.setView(points[0], 17);
      return;
    }

    map.fitBounds(points, {
      padding: [36, 36],
      maxZoom: 17,
    });
  }, [areas, map, sites]);

  return null;
};

const formatPercent = (value: number) =>
  value.toLocaleString('ar-SA', {
    maximumFractionDigits: 1,
  });

export const InvestmentGisAuditPage: React.FC = () => {
  const navigate = useNavigate();
  const { isAdmin, hasPermission } = usePermissions();
  const canEdit = isAdmin || hasPermission('investments', 'canEdit');

  const [areas, setAreas] = React.useState<InvestmentArea[]>([]);
  const [sites, setSites] = React.useState<InvestmentSite[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [search, setSearch] = React.useState('');
  const [siteId, setSiteId] = React.useState('');
  const [severity, setSeverity] = React.useState<GisAuditSeverity | ''>('');
  const [issueCode, setIssueCode] = React.useState<GisAuditIssueCode | ''>('');
  const [warningPercent, setWarningPercent] = React.useState('5');
  const [criticalPercent, setCriticalPercent] = React.useState('10');

  const load = React.useCallback(async () => {
    try {
      setLoading(true);

      const [firstAreas, siteResponse] = await Promise.all([
        investmentsApi.getAreas({ page: 1, limit: 100 }),
        investmentsApi.getSites({ limit: 100 }),
      ]);

      let allAreas = [...firstAreas.items];

      for (
        let pageNumber = 2;
        pageNumber <= firstAreas.pagination.pages;
        pageNumber += 1
      ) {
        const response = await investmentsApi.getAreas({
          page: pageNumber,
          limit: 100,
        });
        allAreas = allAreas.concat(response.items);
      }

      setAreas(allAreas);
      setSites(siteResponse.items);
    } catch (reason) {
      toast.error(
        reason instanceof Error
          ? reason.message
          : 'تعذر تحميل بيانات تدقيق GIS'
      );
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    load();
  }, [load]);

  const normalizedWarning = Math.max(0, Number(warningPercent) || 0);
  const normalizedCritical = Math.max(
    normalizedWarning,
    Number(criticalPercent) || normalizedWarning
  );

  const auditBaseAreas = React.useMemo(
    () => areas.filter((area) => !siteId || area.siteId === siteId),
    [areas, siteId]
  );

  const audit = React.useMemo(
    () =>
      runGisQualityAudit(
        auditBaseAreas,
        {
          warningPercent: normalizedWarning,
          criticalPercent: normalizedCritical,
        },
        sites
      ),
    [auditBaseAreas, normalizedCritical, normalizedWarning, sites]
  );

  const visibleAudits = React.useMemo(
    () => {
      const term = search.trim().toLowerCase();

      return audit.areas.filter((entry) => {
        if (term) {
          const haystack = [
            entry.area.areaCode,
            entry.area.name || '',
            entry.area.site?.name || '',
            entry.area.site?.deed?.deedNumber || '',
          ]
            .join(' ')
            .toLowerCase();

          if (!haystack.includes(term)) return false;
        }

        if (
          severity &&
          !entry.issues.some((issue) => issue.severity === severity)
        ) {
          return false;
        }

        if (
          issueCode &&
          !entry.issues.some((issue) => issue.code === issueCode)
        ) {
          return false;
        }

        return true;
      });
    },
    [audit.areas, issueCode, search, severity]
  );

  const visibleAreas = visibleAudits.map((entry) => entry.area);
  const visibleSiteIds = new Set(visibleAreas.map((area) => area.siteId));
  const visibleSites = sites.filter(
    (site) =>
      (!siteId || site.id === siteId) &&
      (visibleSiteIds.has(site.id) || (visibleAreas.length === 0 && Boolean(siteId)))
  );

  const criticalIssues = audit.areas.reduce(
    (sum, entry) =>
      sum +
      entry.issues.filter((issue) => issue.severity === 'CRITICAL').length,
    0
  );
  const warningIssues = audit.areas.reduce(
    (sum, entry) =>
      sum +
      entry.issues.filter((issue) => issue.severity === 'WARNING').length,
    0
  );

  const resetFilters = () => {
    setSearch('');
    setSiteId('');
    setSeverity('');
    setIssueCode('');
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        <div>
          <Button
            variant="ghost"
            className="mb-2 px-0"
            onClick={() => navigate('/investments/map')}
          >
            <ArrowRight className="me-2 h-4 w-4" />
            الخريطة الاستثمارية
          </Button>

          <h1 className="text-2xl font-bold">تدقيق جودة البيانات الجغرافية</h1>
          <p className="mt-2 text-sm leading-7 text-muted-foreground">
            فحص اكتمال حدود Polygon، فروقات المساحات، التقاطعات الذاتية،
            والتداخلات بين المساحات الاستثمارية قبل رفع مستوى دقة البيانات.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            onClick={() => navigate('/investments/gis-approvals')}
          >
            <ListChecks className="me-2 h-4 w-4" />
            مركز اعتماد GIS
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
          <Button variant="outline" onClick={load} disabled={loading}>
            <RefreshCw className="me-2 h-4 w-4" />
            تحديث التدقيق
          </Button>
        </div>
      </div>

      <Card className="border-sky-200 bg-sky-50/50">
        <CardContent className="p-4 text-sm leading-7 text-sky-950">
          <div className="flex items-start gap-3">
            <ShieldCheck className="mt-1 h-5 w-5 shrink-0" />
            <div>
              <p className="font-semibold">ملاحظة منهجية</p>
              <p>
                عتبات فرق المساحة أدناه قواعد تشغيلية قابلة للتعديل داخل شاشة
                التدقيق وليست معيارًا نظاميًا أو مساحيًا معتمدًا. عند توفر
                Polygon للموقع الرئيسي يفحص النظام وقوع Polygon كل مساحة داخله
                ويرصد أي خروج أو عبور للحدود. وإذا لم تكن حدود الموقع محفوظة
                تظهر ملاحظة تطلب استكمالها قبل اعتماد نتيجة الاحتواء.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-7">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">المساحات المفحوصة</CardTitle>
          </CardHeader>
          <CardContent className="text-3xl font-bold">
            {audit.areas.length}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">تغطية Polygon</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {formatPercent(audit.polygonCoveragePercent)}%
            </div>
            <div className="mt-1 text-xs text-muted-foreground">
              {audit.polygonAreaCount} من {audit.areas.length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">تغطية حدود المواقع</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {formatPercent(audit.siteBoundaryCoveragePercent)}%
            </div>
            <div className="mt-1 text-xs text-muted-foreground">
              {audit.siteBoundaryCount} من {sites.length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">مساحات سليمة</CardTitle>
          </CardHeader>
          <CardContent className="text-3xl font-bold">
            {audit.passedAreaCount}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">مساحات حرجة</CardTitle>
          </CardHeader>
          <CardContent className="text-3xl font-bold">
            {audit.criticalAreaCount}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">خارج نطاق الموقع</CardTitle>
          </CardHeader>
          <CardContent className="text-3xl font-bold">
            {audit.outsideSiteAreaCount}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">أزواج متداخلة</CardTitle>
          </CardHeader>
          <CardContent className="text-3xl font-bold">
            {audit.overlapPairs.length}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">إعدادات وقواعد التدقيق</CardTitle>
        </CardHeader>

        <CardContent className="grid gap-4 lg:grid-cols-2 xl:grid-cols-6">
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">
              تنبيه فرق المساحة %
            </label>
            <Input
              type="number"
              min="0"
              step="0.1"
              value={warningPercent}
              onChange={(event) => setWarningPercent(event.target.value)}
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">
              فرق حرج %
            </label>
            <Input
              type="number"
              min={normalizedWarning}
              step="0.1"
              value={criticalPercent}
              onChange={(event) => setCriticalPercent(event.target.value)}
            />
          </div>

          <div className="space-y-1 xl:col-span-2">
            <label className="text-xs text-muted-foreground">بحث</label>
            <div className="relative">
              <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                className="pr-9"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="رمز المساحة، الموقع، رقم الصك..."
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">الموقع</label>
            <NativeSelect
              value={siteId}
              onChange={(event) => setSiteId(event.target.value)}
            >
              <option value="">جميع المواقع</option>
              {sites.map((site) => (
                <option key={site.id} value={site.id}>
                  {site.name}
                </option>
              ))}
            </NativeSelect>
          </div>

          <div className="flex items-end">
            <Button className="w-full" variant="outline" onClick={resetFilters}>
              مسح الفلاتر
            </Button>
          </div>

          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">الخطورة</label>
            <NativeSelect
              value={severity}
              onChange={(event) =>
                setSeverity(event.target.value as GisAuditSeverity | '')
              }
            >
              <option value="">جميع المستويات</option>
              <option value="CRITICAL">حرجة</option>
              <option value="WARNING">تنبيه</option>
              <option value="INFO">معلومة</option>
            </NativeSelect>
          </div>

          <div className="space-y-1 xl:col-span-2">
            <label className="text-xs text-muted-foreground">نوع الملاحظة</label>
            <NativeSelect
              value={issueCode}
              onChange={(event) =>
                setIssueCode(event.target.value as GisAuditIssueCode | '')
              }
            >
              <option value="">جميع الملاحظات</option>
              {Object.entries(issueLabels).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </NativeSelect>
          </div>

          <div className="xl:col-span-3 flex flex-wrap items-end gap-2">
            <Badge variant="destructive">
              ملاحظات حرجة: {criticalIssues}
            </Badge>
            <Badge variant="outline">
              تنبيهات: {warningIssues}
            </Badge>
            <Badge variant="secondary">
              إجمالي الملاحظات: {audit.issueCount}
            </Badge>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_380px]">
        <Card className="overflow-hidden">
          <CardHeader>
            <CardTitle className="text-base">خريطة نتائج التدقيق</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="h-[560px] w-full border-t">
              <MapContainer
                center={DEFAULT_CENTER}
                zoom={12}
                scrollWheelZoom
                style={{ height: '100%', width: '100%' }}
              >
                <TileLayer
                  attribution="Tiles &copy; Esri"
                  url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
                />

                <FitAuditMap areas={visibleAreas} sites={visibleSites} />

                {visibleSites.map((site) => (
                  site.geoJson ? (
                    <GeoJSON
                      key={`site-boundary-${site.id}`}
                      data={site.geoJson as any}
                      style={{
                        color: '#0f4c81',
                        weight: 3,
                        dashArray: '8 6',
                        fillColor: '#0ea5e9',
                        fillOpacity: 0.04,
                      }}
                    >
                      <Popup>
                        <div dir="rtl" className="min-w-[210px] text-right">
                          <div className="font-bold">{site.name}</div>
                          <div className="mt-1 text-xs">
                            حدود الموقع الرئيسي — {site.code}
                          </div>
                        </div>
                      </Popup>
                    </GeoJSON>
                  ) : null
                ))}

                {visibleAudits.map((entry) => {
                  const critical = entry.issues.some(
                    (issue) => issue.severity === 'CRITICAL'
                  );
                  const warning =
                    !critical &&
                    entry.issues.some(
                      (issue) => issue.severity === 'WARNING'
                    );
                  const color = critical
                    ? severityColors.CRITICAL
                    : warning
                      ? severityColors.WARNING
                      : '#16a34a';

                  const point = finitePoint(entry.area);

                  return (
                    <React.Fragment key={entry.area.id}>
                      {entry.area.geoJson && (
                        <GeoJSON
                          data={entry.area.geoJson as any}
                          style={{
                            color,
                            weight: critical ? 4 : 2,
                            fillColor: color,
                            fillOpacity: critical ? 0.32 : 0.16,
                          }}
                        >
                          <Popup>
                            <div dir="rtl" className="min-w-[220px] text-right">
                              <div className="font-bold">
                                {entry.area.areaCode}
                              </div>
                              <div className="mt-1 text-xs">
                                {entry.area.site?.name || '-'}
                              </div>
                              <div className="mt-2 text-xs">
                                الملاحظات: {entry.issues.length}
                              </div>
                              <button
                                type="button"
                                className="mt-3 rounded border px-2 py-1 text-xs"
                                onClick={() =>
                                  navigate(
                                    `/investments/areas/${entry.area.id}`
                                  )
                                }
                              >
                                فتح المساحة
                              </button>
                            </div>
                          </Popup>
                        </GeoJSON>
                      )}

                      {!entry.area.geoJson && point && (
                        <CircleMarker
                          center={point}
                          radius={8}
                          pathOptions={{
                            color: '#ffffff',
                            weight: 2,
                            fillColor: color,
                            fillOpacity: 0.95,
                          }}
                        >
                          <Popup>
                            <div dir="rtl" className="text-right">
                              <div className="font-bold">
                                {entry.area.areaCode}
                              </div>
                              <div className="mt-1 text-xs">
                                لا توجد حدود Polygon.
                              </div>
                            </div>
                          </Popup>
                        </CircleMarker>
                      )}
                    </React.Fragment>
                  );
                })}
              </MapContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">تفسير الألوان</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <div className="flex items-center gap-3">
              <CircleAlert className="h-5 w-5 text-red-600" />
              <div>
                <p className="font-semibold">أحمر — ملاحظة حرجة</p>
                <p className="text-xs text-muted-foreground">
                  تداخل، تقاطع ذاتي، Polygon غير صالح، خروج عن حدود الموقع، أو فرق يتجاوز العتبة الحرجة.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <AlertTriangle className="h-5 w-5 text-amber-600" />
              <div>
                <p className="font-semibold">برتقالي — يحتاج مراجعة</p>
                <p className="text-xs text-muted-foreground">
                  حدود مساحة أو موقع رئيسي مفقودة، بيانات مساحية ناقصة، أو فرق ضمن مستوى التنبيه.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <CheckCircle2 className="h-5 w-5 text-emerald-600" />
              <div>
                <p className="font-semibold">أخضر — اجتاز القواعد الحالية</p>
                <p className="text-xs text-muted-foreground">
                  لم يرصد النظام ملاحظات وفق العتبات المختارة.
                </p>
              </div>
            </div>

            <div className="rounded-xl border bg-muted/20 p-3 text-xs leading-6 text-muted-foreground">
              حدود الموقع الرئيسي مرسومة بخط أزرق متقطع، بينما ألوان المساحات
              تعكس نتيجة التدقيق. الفحص الآلي أداة ضبط جودة مساندة؛ نتيجة
              «سليم» لا تحول الرسم إلى رفع مساحي رسمي ولا تغني عن اعتماد الجهة المختصة.
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <CardTitle className="text-base">
                سجل ملاحظات الجودة ({visibleAudits.length})
              </CardTitle>
              <p className="mt-1 text-xs text-muted-foreground">
                تعرض القائمة نتيجة كل مساحة بعد تطبيق الفلاتر والعتبات الحالية.
              </p>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>المساحة</TableHead>
                <TableHead>الموقع الرئيسي</TableHead>
                <TableHead>Polygon</TableHead>
                <TableHead>الملاحظات</TableHead>
                <TableHead>النتيجة</TableHead>
                <TableHead>الإجراء</TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {visibleAudits.map((entry) => {
                const hasCritical = entry.issues.some(
                  (issue) => issue.severity === 'CRITICAL'
                );
                const hasSiteBoundaryIssue = entry.issues.some((issue) =>
                  [
                    'MISSING_SITE_BOUNDARY',
                    'INVALID_SITE_BOUNDARY',
                    'SITE_BOUNDARY_SELF_INTERSECTION',
                  ].includes(issue.code)
                );

                return (
                  <TableRow key={entry.area.id}>
                    <TableCell>
                      <div className="font-semibold" dir="ltr">
                        {entry.area.areaCode}
                      </div>
                      <div className="mt-1 text-xs text-muted-foreground">
                        {entry.area.name || '-'}
                      </div>
                    </TableCell>

                    <TableCell>{entry.area.site?.name || '-'}</TableCell>

                    <TableCell>
                      {entry.polygonAreaSqm == null ? (
                        <Badge variant="outline">غير موجود</Badge>
                      ) : (
                        <div>
                          <div className="font-medium">
                            {entry.polygonAreaSqm.toLocaleString('ar-SA', {
                              maximumFractionDigits: 2,
                            })}{' '}
                            م²
                          </div>
                          <div className="mt-1 text-xs text-muted-foreground">
                            {entry.vertexCount} نقاط
                          </div>
                        </div>
                      )}
                    </TableCell>

                    <TableCell className="max-w-[420px]">
                      {entry.issues.length === 0 ? (
                        <span className="text-sm text-emerald-700">
                          لا توجد ملاحظات
                        </span>
                      ) : (
                        <div className="space-y-2">
                          {entry.issues.map((issue) => (
                            <div
                              key={issue.id}
                              className="rounded-lg border p-2 text-xs"
                            >
                              <div className="flex flex-wrap items-center gap-2">
                                <Badge
                                  variant={
                                    issue.severity === 'CRITICAL'
                                      ? 'destructive'
                                      : 'outline'
                                  }
                                >
                                  {severityLabels[issue.severity]}
                                </Badge>
                                <span className="font-semibold">
                                  {issue.title}
                                </span>
                              </div>
                              <p className="mt-1 leading-5 text-muted-foreground">
                                {issue.description}
                              </p>
                            </div>
                          ))}
                        </div>
                      )}
                    </TableCell>

                    <TableCell>
                      {entry.passed ? (
                        <Badge variant="secondary">
                          <CheckCircle2 className="me-1 h-3 w-3" />
                          سليم
                        </Badge>
                      ) : hasCritical ? (
                        <Badge variant="destructive">
                          <TriangleAlert className="me-1 h-3 w-3" />
                          حرج
                        </Badge>
                      ) : (
                        <Badge variant="outline">
                          <AlertTriangle className="me-1 h-3 w-3" />
                          مراجعة
                        </Badge>
                      )}
                    </TableCell>

                    <TableCell>
                      <div className="flex flex-col gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() =>
                            navigate(
                              `/investments/map?areaId=${encodeURIComponent(
                                entry.area.id
                              )}`
                            )
                          }
                        >
                          <MapPin className="me-1 h-4 w-4" />
                          خريطة
                        </Button>

                        {canEdit && (
                          <>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() =>
                                navigate(
                                  `/investments/areas/${entry.area.id}/edit`
                                )
                              }
                            >
                              معالجة المساحة
                            </Button>

                            {hasSiteBoundaryIssue && (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() =>
                                  navigate(
                                    `/investments/sites/${entry.area.siteId}/edit`
                                  )
                                }
                              >
                                حدود الموقع
                              </Button>
                            )}
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>

          {loading && (
            <p className="p-8 text-center text-sm text-muted-foreground">
              جارٍ تنفيذ تدقيق GIS...
            </p>
          )}

          {!loading && visibleAudits.length === 0 && (
            <p className="p-8 text-center text-sm text-muted-foreground">
              لا توجد مساحات مطابقة للفلاتر الحالية.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
