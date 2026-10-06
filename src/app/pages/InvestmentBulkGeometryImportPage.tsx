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
  type PolygonCoordinate,
} from '../../features/investments/geometry';
import type { InvestmentArea } from '../../features/investments/types';
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
  targetAreaId: string;
  autoMatched: boolean;
};

const DEFAULT_CENTER: [number, number] = [26.3927, 50.1906];

const normalize = (value: string) =>
  value
    .trim()
    .toUpperCase()
    .replace(/\s+/g, '')
    .replace(/_/g, '-');

const extractAreaCodeCandidate = (
  sourceName: string,
  areas: InvestmentArea[]
) => {
  const normalizedName = normalize(sourceName);

  const exact = areas.find(
    (area) => normalize(area.areaCode) === normalizedName
  );
  if (exact) return exact;

  return areas.find((area) => {
    const code = normalize(area.areaCode);
    return normalizedName.includes(code);
  });
};

const getPositions = (feature: ImportedGeometryItem['feature']) =>
  getPolygonMetrics(feature).points.map(
    ([longitude, latitude]) => [latitude, longitude] as [number, number]
  );

const FitImportedGeometry: React.FC<{ rows: MatchRow[] }> = ({ rows }) => {
  const map = useMap();

  React.useEffect(() => {
    const points: [number, number][] = rows.flatMap((row) =>
      getPolygonMetrics(row.feature).points.map(
        ([longitude, latitude]) => [latitude, longitude] as [number, number]
      )
    );

    if (!points.length) return;

    if (points.length === 1) {
      map.setView(points[0], 17);
      return;
    }

    map.fitBounds(points, {
      padding: [36, 36],
      maxZoom: 18,
    });
  }, [map, rows]);

  return null;
};

const formatArea = (value: number) =>
  value.toLocaleString('ar-SA', { maximumFractionDigits: 2 });

export const InvestmentBulkGeometryImportPage: React.FC = () => {
  const navigate = useNavigate();
  const fileInputRef = React.useRef<HTMLInputElement | null>(null);

  const [areas, setAreas] = React.useState<InvestmentArea[]>([]);
  const [rows, setRows] = React.useState<MatchRow[]>([]);
  const [fileName, setFileName] = React.useState('');
  const [loadingAreas, setLoadingAreas] = React.useState(true);
  const [parsing, setParsing] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [layer, setLayer] = React.useState<'street' | 'satellite'>('satellite');

  const loadAreas = React.useCallback(async () => {
    try {
      setLoadingAreas(true);

      const first = await investmentsApi.getAreas({ page: 1, limit: 100 });
      let items = [...first.items];

      for (
        let page = 2;
        page <= first.pagination.pages;
        page += 1
      ) {
        const response = await investmentsApi.getAreas({ page, limit: 100 });
        items = items.concat(response.items);
      }

      setAreas(items);
    } catch (reason) {
      toast.error(
        reason instanceof Error
          ? reason.message
          : 'تعذر تحميل المساحات الاستثمارية'
      );
    } finally {
      setLoadingAreas(false);
    }
  }, []);

  React.useEffect(() => {
    loadAreas();
  }, [loadAreas]);

  const matchedRows = rows.filter((row) => row.targetAreaId);
  const unmatchedRows = rows.filter((row) => !row.targetAreaId);
  const assignedIds = matchedRows.map((row) => row.targetAreaId);
  const duplicateAssignments =
    assignedIds.length !== new Set(assignedIds).size;

  const matchedAreaByRow = React.useMemo(() => {
    const byId = new Map(areas.map((area) => [area.id, area]));
    return new Map(
      rows.map((row) => [row.importIndex, byId.get(row.targetAreaId)])
    );
  }, [areas, rows]);

  const replacingCount = rows.filter((row) => {
    const area = matchedAreaByRow.get(row.importIndex);
    return Boolean(area?.geoJson);
  }).length;

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
        const match = extractAreaCodeCandidate(item.sourceName, areas);

        return {
          importIndex: index,
          sourceName: item.sourceName,
          feature: item.feature,
          targetAreaId: match?.id || '',
          autoMatched: Boolean(match),
        };
      });

      setRows(nextRows);
      setFileName(file.name);

      const autoMatched = nextRows.filter((row) => row.targetAreaId).length;
      toast.success(
        `تم قراءة ${nextRows.length} Polygon. طابق النظام ${autoMatched} منها تلقائيًا.`
      );
    } catch (reason) {
      resetFile();
      toast.error(
        reason instanceof Error ? reason.message : 'تعذر قراءة ملف GIS'
      );
    } finally {
      setParsing(false);
    }
  };

  const setTarget = (importIndex: number, targetAreaId: string) => {
    setRows((current) =>
      current.map((row) =>
        row.importIndex === importIndex
          ? {
              ...row,
              targetAreaId,
              autoMatched: false,
            }
          : row
      )
    );
  };

  const autoMatchAgain = () => {
    setRows((current) =>
      current.map((row) => {
        const match = extractAreaCodeCandidate(row.sourceName, areas);
        return {
          ...row,
          targetAreaId: match?.id || '',
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
      toast.error('يجب مطابقة جميع Polygons مع المساحات قبل الاعتماد.');
      return;
    }

    if (duplicateAssignments) {
      toast.error('تم ربط أكثر من Polygon بالمساحة نفسها. عدّل المطابقة قبل الاعتماد.');
      return;
    }

    const confirmed = window.confirm(
      [
        'مراجعة نهائية قبل تحديث الحدود:',
        `عدد Polygons: ${rows.length}`,
        `المطابقة المكتملة: ${matchedRows.length}`,
        `حدود موجودة سيتم استبدالها: ${replacingCount}`,
        '',
        'سيتم تحديث GeoJSON والإحداثية المرجعية للمساحات المطابقة داخل عملية واحدة.',
        'لن يتم تعديل المساحة التقريبية أو المساحية المعتمدة.',
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
          throw new Error(`تعذر حساب مركز Polygon: ${row.sourceName}`);
        }

        return {
          areaId: row.targetAreaId,
          geoJson: row.feature,
          latitude: metrics.centroid.latitude,
          longitude: metrics.centroid.longitude,
        };
      });

      const result = await investmentsApi.bulkUpdateGeometry(payload);

      toast.success(
        `تم تحديث حدود ${result.updated} مساحة استثمارية بنجاح.`
      );

      navigate('/investments/map', { replace: true });
    } catch (reason) {
      toast.error(
        reason instanceof Error
          ? reason.message
          : 'تعذر اعتماد تحديث الحدود الجماعي'
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
            onClick={() => navigate('/investments/map')}
          >
            <ArrowRight className="me-2 h-4 w-4" />
            الخريطة الاستثمارية
          </Button>

          <h1 className="text-2xl font-bold">
            استيراد حدود GIS جماعي
          </h1>
          <p className="mt-2 text-sm leading-7 text-muted-foreground">
            ارفع ملف KML أو KMZ أو GeoJSON يحتوي على عدة Polygons، ثم راجع
            مطابقة كل Polygon مع رمز المساحة قبل اعتماد التحديث الجماعي.
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
            disabled={parsing || loadingAreas}
            onClick={() => fileInputRef.current?.click()}
          >
            <FileUp className="me-2 h-4 w-4" />
            {parsing ? 'جارٍ قراءة الملف...' : 'رفع ملف GIS'}
          </Button>

          {rows.length > 0 && (
            <Button variant="outline" onClick={resetFile} disabled={saving}>
              <XCircle className="me-2 h-4 w-4" />
              إلغاء الملف
            </Button>
          )}
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Polygons في الملف</CardTitle>
          </CardHeader>
          <CardContent className="text-3xl font-bold">
            {rows.length}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">المطابقة المكتملة</CardTitle>
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
            <CardTitle className="text-sm">مساحة الرسم الإجمالية</CardTitle>
          </CardHeader>
          <CardContent className="text-xl font-bold">
            {formatArea(totalImportedArea)} م²
          </CardContent>
        </Card>
      </div>

      {rows.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <MapPinned className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
            <p className="font-semibold">لم يتم رفع ملف GIS بعد</p>
            <p className="mt-2 text-sm leading-7 text-muted-foreground">
              يدعم الاستيراد GeoJSON وKML وKMZ بحد أقصى 10 MB وحتى 500 Polygon.
              للحصول على مطابقة تلقائية أفضل، اجعل اسم الـFeature أو Placemark
              مساويًا لرمز المساحة مثل EAST-03.
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          <Card>
            <CardHeader>
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <CardTitle className="text-base">معاينة الحدود المستوردة</CardTitle>
                  <p className="mt-1 text-xs text-muted-foreground">
                    الملف: {fileName}
                  </p>
                </div>

                <div className="flex flex-wrap gap-2">
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

                  <FitImportedGeometry rows={rows} />

                  {rows.map((row) => {
                    const positions = getPositions(row.feature);
                    const matched = Boolean(row.targetAreaId);

                    return (
                      <Polygon
                        key={row.importIndex}
                        positions={positions}
                        pathOptions={{
                          color: matched ? '#16a34a' : '#ea580c',
                          fillColor: matched ? '#22c55e' : '#f97316',
                          fillOpacity: 0.2,
                          weight: 3,
                        }}
                      >
                        <Tooltip sticky>
                          <div dir="rtl" className="text-right">
                            <div className="font-semibold">{row.sourceName}</div>
                            <div className="mt-1 text-xs">
                              {matched
                                ? matchedAreaByRow.get(row.importIndex)?.areaCode
                                : 'غير مطابق'}
                            </div>
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
                    لا يمكن ربط Polygonين مختلفين بالمساحة نفسها في عملية
                    الاستيراد. عدّل الاختيارات أدناه.
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <CardTitle className="text-base">مطابقة Polygons مع المساحات</CardTitle>
                  <p className="mt-1 text-xs leading-6 text-muted-foreground">
                    المطابقة التلقائية تعتمد على رمز المساحة في اسم Feature أو
                    Placemark. يمكنك تعديل أي اختيار يدويًا قبل الحفظ.
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
                    <TableHead>المساحة المحسوبة</TableHead>
                    <TableHead>المساحة المطابقة</TableHead>
                    <TableHead>الحالة</TableHead>
                  </TableRow>
                </TableHeader>

                <TableBody>
                  {rows.map((row) => {
                    const metrics = getPolygonMetrics(row.feature);
                    const target = matchedAreaByRow.get(row.importIndex);
                    const replacing = Boolean(target?.geoJson);

                    return (
                      <TableRow key={row.importIndex}>
                        <TableCell>{row.importIndex + 1}</TableCell>

                        <TableCell>
                          <div className="font-semibold">{row.sourceName}</div>
                          <div className="mt-1 text-xs text-muted-foreground">
                            {metrics.vertexCount} نقاط
                          </div>
                        </TableCell>

                        <TableCell>
                          {formatArea(metrics.calculatedAreaSqm)} م²
                        </TableCell>

                        <TableCell className="min-w-[260px]">
                          <NativeSelect
                            value={row.targetAreaId}
                            onChange={(event) =>
                              setTarget(row.importIndex, event.target.value)
                            }
                          >
                            <option value="">— اختر المساحة —</option>
                            {areas.map((area) => (
                              <option key={area.id} value={area.id}>
                                {area.areaCode} — {area.site?.name || area.name || ''}
                              </option>
                            ))}
                          </NativeSelect>
                        </TableCell>

                        <TableCell>
                          {!row.targetAreaId ? (
                            <Badge variant="outline">
                              يحتاج مطابقة
                            </Badge>
                          ) : replacing ? (
                            <Badge variant="outline">
                              سيستبدل حدودًا محفوظة
                            </Badge>
                          ) : row.autoMatched ? (
                            <Badge variant="secondary">
                              مطابق تلقائيًا
                            </Badge>
                          ) : (
                            <Badge>
                              مطابق يدويًا
                            </Badge>
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
                {unmatchedRows.length === 0 && !duplicateAssignments ? (
                  <CheckCircle2 className="mt-1 h-6 w-6 text-emerald-600" />
                ) : (
                  <ShieldCheck className="mt-1 h-6 w-6 text-primary" />
                )}

                <div>
                  <p className="font-semibold">اعتماد تحديث الحدود الجماعي</p>
                  <p className="mt-1 text-sm leading-7 text-muted-foreground">
                    يتم تحديث GeoJSON والإحداثية المركزية فقط. لا تتغير المساحة
                    التقريبية أو المساحة المساحية المعتمدة تلقائيًا.
                  </p>
                  {replacingCount > 0 && (
                    <p className="mt-1 text-xs text-amber-700">
                      تنبيه: {replacingCount} مساحة لديها حدود محفوظة حاليًا وسيتم
                      استبدالها بعد التأكيد.
                    </p>
                  )}
                </div>
              </div>

              <Button
                size="lg"
                disabled={
                  saving ||
                  unmatchedRows.length > 0 ||
                  duplicateAssignments ||
                  rows.length === 0
                }
                onClick={handleSave}
              >
                <Save className="me-2 h-5 w-5" />
                {saving
                  ? 'جارٍ اعتماد الحدود...'
                  : `اعتماد حدود ${rows.length} مساحة`}
              </Button>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
};
