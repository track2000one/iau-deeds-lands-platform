import React from 'react';
import { toast } from 'sonner';
import L from 'leaflet';
import {
  MapContainer,
  Marker,
  Polygon,
  TileLayer,
  useMap,
  useMapEvents,
} from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import {
  buildPolygonFeature,
  calculateDifference,
  calculatePolygonAreaSqm,
  calculatePolygonCentroid,
  extractOuterRing,
  type InvestmentPolygonFeature,
  type PolygonCoordinate,
} from '../../features/investments/geometry';
import {
  downloadGeoJson,
  downloadKml,
  downloadKmz,
  parseGeometryFile,
} from '../../features/investments/geometryFiles';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import {
  Download,
  FileJson,
  FileUp,
  Globe2,
  Layers,
  MousePointer2,
  RotateCcw,
  Trash2,
  Undo2,
} from 'lucide-react';

type InvestmentPolygonEditorProps = {
  geoJson?: unknown;
  referenceCoordinates?: {
    latitude: number;
    longitude: number;
  };
  approximateArea?: number | null;
  surveyedArea?: number | null;
  fileBaseName?: string;
  onGeometryChange: (
    geoJson: InvestmentPolygonFeature | null,
    metrics: {
      calculatedAreaSqm: number;
      centroid: { latitude: number; longitude: number } | null;
      vertexCount: number;
    }
  ) => void;
};

const DEFAULT_CENTER: [number, number] = [26.3927, 50.1906];

const vertexIcon = (index: number) =>
  L.divIcon({
    className: '',
    html: `<div style="
      width:26px;
      height:26px;
      border-radius:9999px;
      background:#ffffff;
      border:3px solid #0f172a;
      box-shadow:0 2px 8px rgba(15,23,42,.28);
      display:flex;
      align-items:center;
      justify-content:center;
      font-size:10px;
      font-weight:800;
      color:#0f172a;
    ">${index + 1}</div>`,
    iconSize: [26, 26],
    iconAnchor: [13, 13],
  });

const MapDraftClickHandler: React.FC<{
  enabled: boolean;
  onAdd: (coordinate: PolygonCoordinate) => void;
}> = ({ enabled, onAdd }) => {
  useMapEvents({
    click(event) {
      if (!enabled) return;
      onAdd([
        Number(event.latlng.lng.toFixed(7)),
        Number(event.latlng.lat.toFixed(7)),
      ]);
    },
  });

  return null;
};

const FitPolygon: React.FC<{
  points: PolygonCoordinate[];
  referenceCoordinates?: {
    latitude: number;
    longitude: number;
  };
}> = ({ points, referenceCoordinates }) => {
  const map = useMap();

  React.useEffect(() => {
    if (points.length >= 2) {
      map.fitBounds(
        points.map(([longitude, latitude]) => [latitude, longitude] as [number, number]),
        { padding: [36, 36], maxZoom: 18 }
      );
      return;
    }

    if (points.length === 1) {
      map.setView([points[0][1], points[0][0]], 18);
      return;
    }

    if (referenceCoordinates) {
      map.setView(
        [referenceCoordinates.latitude, referenceCoordinates.longitude],
        17
      );
    }
  }, [map, points, referenceCoordinates]);

  return null;
};

const formatArea = (value: number) =>
  value.toLocaleString('ar-SA', { maximumFractionDigits: 2 });

const DifferenceBadge: React.FC<{
  label: string;
  calculated: number;
  reference?: number | null;
}> = ({ label, calculated, reference }) => {
  const difference = calculateDifference(calculated, reference);

  if (!difference) {
    return (
      <Badge variant="outline">
        {label}: لا توجد قيمة للمقارنة
      </Badge>
    );
  }

  const sign = difference.differenceSqm > 0 ? '+' : '';
  return (
    <Badge variant="outline">
      {label}: {sign}{formatArea(difference.differenceSqm)} م²
      {' '}
      ({sign}{difference.percentage.toFixed(2)}%)
    </Badge>
  );
};

export const InvestmentPolygonEditor: React.FC<
  InvestmentPolygonEditorProps
> = ({
  geoJson,
  referenceCoordinates,
  approximateArea,
  surveyedArea,
  fileBaseName = 'investment-area',
  onGeometryChange,
}) => {
  const [points, setPoints] = React.useState<PolygonCoordinate[]>(() =>
    extractOuterRing(geoJson)
  );
  const [drawing, setDrawing] = React.useState(false);
  const [layer, setLayer] = React.useState<'street' | 'satellite'>('satellite');
  const [importingFile, setImportingFile] = React.useState(false);
  const fileInputRef = React.useRef<HTMLInputElement | null>(null);

  const externalKey = React.useMemo(() => JSON.stringify(geoJson ?? null), [geoJson]);

  React.useEffect(() => {
    const incoming = extractOuterRing(geoJson);
    setPoints((current) => {
      const currentKey = JSON.stringify(current);
      const incomingKey = JSON.stringify(incoming);
      return currentKey === incomingKey ? current : incoming;
    });
  }, [externalKey, geoJson]);

  const publish = React.useCallback(
    (nextPoints: PolygonCoordinate[]) => {
      setPoints(nextPoints);

      const calculatedAreaSqm = calculatePolygonAreaSqm(nextPoints);
      const centroid = calculatePolygonCentroid(nextPoints);
      const feature = buildPolygonFeature(nextPoints);

      onGeometryChange(feature, {
        calculatedAreaSqm,
        centroid,
        vertexCount: nextPoints.length,
      });
    },
    [onGeometryChange]
  );

  const areaSqm = React.useMemo(
    () => calculatePolygonAreaSqm(points),
    [points]
  );

  const removePoint = (index: number) => {
    publish(points.filter((_, pointIndex) => pointIndex !== index));
  };

  const updatePoint = (
    index: number,
    coordinate: PolygonCoordinate
  ) => {
    const next = [...points];
    next[index] = coordinate;
    publish(next);
  };

  const clear = () => {
    publish([]);
    setDrawing(false);
  };

  const importGeometryFile = async (file?: File) => {
    if (!file) return;

    try {
      setImportingFile(true);
      const feature = await parseGeometryFile(file);
      const importedPoints = extractOuterRing(feature);

      publish(importedPoints);
      setDrawing(false);
      toast.success(
        `تم استيراد حدود Polygon من ${file.name} بعدد ${importedPoints.length} نقاط.`
      );
    } catch (reason) {
      toast.error(
        reason instanceof Error ? reason.message : 'تعذر استيراد ملف الحدود'
      );
    } finally {
      setImportingFile(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const exportGeoJson = () => {
    const feature = buildPolygonFeature(points);
    if (!feature) return;
    downloadGeoJson(feature, fileBaseName);
  };

  const exportKml = () => {
    const feature = buildPolygonFeature(points);
    if (!feature) return;
    downloadKml(feature, fileBaseName);
  };

  const exportKmz = async () => {
    const feature = buildPolygonFeature(points);
    if (!feature) return;

    try {
      await downloadKmz(feature, fileBaseName);
    } catch (reason) {
      toast.error(
        reason instanceof Error ? reason.message : 'تعذر تصدير ملف KMZ'
      );
    }
  };

  const undo = () => {
    if (points.length === 0) return;
    publish(points.slice(0, -1));
  };

  const center: [number, number] = points.length
    ? [points[0][1], points[0][0]]
    : referenceCoordinates
      ? [referenceCoordinates.latitude, referenceCoordinates.longitude]
      : DEFAULT_CENTER;

  return (
    <Card className="overflow-hidden">
      <CardHeader className="space-y-3">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <CardTitle className="text-base">رسم حدود المساحة Polygon</CardTitle>
            <p className="mt-1 text-xs leading-6 text-muted-foreground">
              فعّل وضع الرسم ثم انقر على زوايا الأرض بالترتيب. يمكن سحب كل نقطة
              لتعديلها، أو حذفها من قائمة النقاط.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              accept=".geojson,.json,.kml,.kmz,application/geo+json,application/json,application/vnd.google-earth.kml+xml,application/vnd.google-earth.kmz"
              onChange={(event) => importGeometryFile(event.target.files?.[0])}
            />

            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={importingFile}
              onClick={() => fileInputRef.current?.click()}
            >
              <FileUp className="me-2 h-4 w-4" />
              {importingFile ? 'جارٍ الاستيراد...' : 'استيراد KML / KMZ / GeoJSON'}
            </Button>

            <Button
              type="button"
              size="sm"
              variant={drawing ? 'default' : 'outline'}
              onClick={() => setDrawing((value) => !value)}
            >
              <MousePointer2 className="me-2 h-4 w-4" />
              {drawing ? 'إيقاف الرسم' : 'بدء الرسم'}
            </Button>

            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={points.length === 0}
              onClick={undo}
            >
              <Undo2 className="me-2 h-4 w-4" />
              تراجع
            </Button>

            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={points.length === 0}
              onClick={clear}
            >
              <RotateCcw className="me-2 h-4 w-4" />
              مسح الحدود
            </Button>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Badge variant={points.length >= 3 ? 'secondary' : 'outline'}>
            عدد النقاط: {points.length}
          </Badge>
          <Badge variant={points.length >= 3 ? 'secondary' : 'outline'}>
            المساحة المحسوبة: {points.length >= 3 ? `${formatArea(areaSqm)} م²` : 'تحتاج 3 نقاط'}
          </Badge>
          {points.length >= 3 && (
            <>
              <DifferenceBadge
                label="الفرق عن التقريبية"
                calculated={areaSqm}
                reference={approximateArea}
              />
              <DifferenceBadge
                label="الفرق عن المساحية"
                calculated={areaSqm}
                reference={surveyedArea}
              />
            </>
          )}
        </div>

        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={points.length < 3}
            onClick={exportGeoJson}
          >
            <FileJson className="me-2 h-4 w-4" />
            تصدير GeoJSON
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={points.length < 3}
            onClick={exportKml}
          >
            <Globe2 className="me-2 h-4 w-4" />
            تصدير KML
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={points.length < 3}
            onClick={exportKmz}
          >
            <Download className="me-2 h-4 w-4" />
            تصدير KMZ
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-4 p-0">
        <div className="flex flex-wrap gap-2 px-5">
          <Button
            type="button"
            size="sm"
            variant={layer === 'street' ? 'default' : 'outline'}
            onClick={() => setLayer('street')}
          >
            خريطة
          </Button>
          <Button
            type="button"
            size="sm"
            variant={layer === 'satellite' ? 'default' : 'outline'}
            onClick={() => setLayer('satellite')}
          >
            <Layers className="me-2 h-4 w-4" />
            قمر صناعي
          </Button>
        </div>

        <div className="h-[470px] w-full border-y">
          <MapContainer
            center={center}
            zoom={17}
            scrollWheelZoom
            doubleClickZoom={!drawing}
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

            <MapDraftClickHandler
              enabled={drawing}
              onAdd={(coordinate) => publish([...points, coordinate])}
            />

            <FitPolygon
              points={points}
              referenceCoordinates={referenceCoordinates}
            />

            {points.length >= 2 && (
              <Polygon
                positions={points.map(
                  ([longitude, latitude]) => [latitude, longitude] as [number, number]
                )}
                pathOptions={{
                  color: '#0f766e',
                  weight: 3,
                  fillColor: '#14b8a6',
                  fillOpacity: points.length >= 3 ? 0.2 : 0,
                }}
              />
            )}

            {points.map(([longitude, latitude], index) => (
              <Marker
                key={`${index}-${longitude}-${latitude}`}
                position={[latitude, longitude]}
                icon={vertexIcon(index)}
                draggable
                eventHandlers={{
                  dragend(event) {
                    const marker = event.target as L.Marker;
                    const position = marker.getLatLng();
                    updatePoint(index, [
                      Number(position.lng.toFixed(7)),
                      Number(position.lat.toFixed(7)),
                    ]);
                  },
                }}
              />
            ))}
          </MapContainer>
        </div>

        <div className="space-y-3 px-5 pb-5">
          {drawing && (
            <p className="rounded-xl border border-sky-200 bg-sky-50 p-3 text-xs leading-6 text-sky-950">
              وضع الرسم مفعل: اضغط على الخريطة لإضافة نقطة جديدة. بعد ثلاث نقاط
              سيظهر المضلع وتحسب مساحته تلقائيًا.
            </p>
          )}

          {points.length > 0 && (
            <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
              {points.map(([longitude, latitude], index) => (
                <div
                  key={`row-${index}-${longitude}-${latitude}`}
                  className="flex items-center justify-between gap-2 rounded-xl border bg-muted/20 p-3"
                >
                  <div className="min-w-0">
                    <p className="text-xs font-semibold">النقطة {index + 1}</p>
                    <p className="mt-1 truncate font-mono text-[11px] text-muted-foreground" dir="ltr">
                      {latitude.toFixed(7)}, {longitude.toFixed(7)}
                    </p>
                  </div>
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    onClick={() => removePoint(index)}
                    title="حذف النقطة"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}

          <p className="text-xs leading-6 text-muted-foreground">
            المساحة المحسوبة من الرسم قيمة هندسية مساعدة للمقارنة ولا تستبدل
            المساحة النظامية أو الرفع المساحي المعتمد إلا بعد التحقق واعتماد
            الجهة المختصة.
          </p>
        </div>
      </CardContent>
    </Card>
  );
};
