import React from 'react';
import {
  ArrowRight,
  Eye,
  FileUp,
  Layers,
  ListFilter,
  MapPin,
  Navigation,
  Search,
  ShieldCheck,
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
import { useNavigate, useSearchParams } from 'react-router';
import { toast } from 'sonner';
import { investmentsApi } from '../../features/investments/api';
import { usePermissions } from '../../context/PermissionsContext';
import type {
  InvestmentArea,
  InvestmentAreaStatus,
  InvestmentReadiness,
  InvestmentSite,
} from '../../features/investments/types';
import { openGoogleMapsLocation } from '../utils/mapNavigation';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { NativeSelect } from '../components/ui/native-select';

const DEFAULT_CENTER: [number, number] = [26.3927, 50.1906];

const statusLabels: Record<InvestmentAreaStatus, string> = {
  AVAILABLE: 'متاحة',
  OCCUPIED: 'مشغولة',
  PARTIALLY_OCCUPIED: 'مستغلة جزئيًا',
  RESERVED: 'محجوزة',
  ALLOCATED: 'مخصصة',
  UNAVAILABLE: 'غير متاحة',
};

const readinessLabels: Record<InvestmentReadiness, string> = {
  NOT_ASSESSED: 'لم تُقيّم',
  UNDER_REVIEW: 'تحت الدراسة',
  READY: 'جاهزة للاستثمار',
  NOT_SUITABLE: 'غير مناسبة',
};

const statusColors: Record<InvestmentAreaStatus, string> = {
  AVAILABLE: '#16a34a',
  OCCUPIED: '#64748b',
  PARTIALLY_OCCUPIED: '#ca8a04',
  RESERVED: '#ea580c',
  ALLOCATED: '#2563eb',
  UNAVAILABLE: '#dc2626',
};

const finiteCoordinate = (value: unknown) => {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
};

const getPoint = (area: InvestmentArea): [number, number] | null => {
  const latitude = finiteCoordinate(area.latitude);
  const longitude = finiteCoordinate(area.longitude);

  if (latitude == null || longitude == null) return null;
  if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
    return null;
  }

  return [latitude, longitude];
};

const FitVisibleAreas: React.FC<{ areas: InvestmentArea[] }> = ({ areas }) => {
  const map = useMap();

  React.useEffect(() => {
    const points = areas
      .map(getPoint)
      .filter((point): point is [number, number] => Boolean(point));

    if (points.length === 0) return;

    if (points.length === 1) {
      map.setView(points[0], 16, { animate: true });
      return;
    }

    map.fitBounds(points, {
      padding: [36, 36],
      maxZoom: 16,
      animate: true,
    });
  }, [areas, map]);

  return null;
};

const FocusSelectedArea: React.FC<{ area?: InvestmentArea }> = ({ area }) => {
  const map = useMap();

  React.useEffect(() => {
    const point = area ? getPoint(area) : null;
    if (!point) return;
    map.flyTo(point, Math.max(map.getZoom(), 16), { duration: 0.7 });
  }, [area, map]);

  return null;
};

export const InvestmentMapPage: React.FC = () => {
  const navigate = useNavigate();
  const [queryParams] = useSearchParams();
  const { isAdmin, hasPermission } = usePermissions();
  const canEdit = isAdmin || hasPermission('investments', 'canEdit');

  const [areas, setAreas] = React.useState<InvestmentArea[]>([]);
  const [sites, setSites] = React.useState<InvestmentSite[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [search, setSearch] = React.useState('');
  const [siteId, setSiteId] = React.useState(
    () => queryParams.get('siteId') || ''
  );
  const [status, setStatus] = React.useState<InvestmentAreaStatus | ''>('');
  const [readiness, setReadiness] = React.useState<InvestmentReadiness | ''>('');
  const [selectedAreaId, setSelectedAreaId] = React.useState(
    () => queryParams.get('areaId') || ''
  );
  const [mapLayer, setMapLayer] = React.useState<'street' | 'satellite'>('street');

  React.useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        setLoading(true);
        const [areasResponse, sitesResponse] = await Promise.all([
          investmentsApi.getAreas({ limit: 100 }),
          investmentsApi.getSites({ limit: 100 }),
        ]);

        if (cancelled) return;
        setAreas(areasResponse.items);
        setSites(sitesResponse.items);
      } catch (reason) {
        if (!cancelled) {
          toast.error(
            reason instanceof Error
              ? reason.message
              : 'تعذر تحميل الخريطة الاستثمارية'
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const filteredAreas = React.useMemo(() => {
    const term = search.trim().toLowerCase();

    return areas.filter((area) => {
      if (siteId && area.siteId !== siteId) return false;
      if (status && area.occupancyStatus !== status) return false;
      if (readiness && area.investmentReadiness !== readiness) return false;

      if (term) {
        const haystack = [
          area.areaCode,
          area.name || '',
          area.site?.name || '',
          area.site?.deed?.deedNumber || '',
          area.currentUse || '',
          area.proposedUse || '',
        ]
          .join(' ')
          .toLowerCase();

        if (!haystack.includes(term)) return false;
      }

      return Boolean(getPoint(area) || area.geoJson);
    });
  }, [areas, readiness, search, siteId, status]);

  const selectedArea = React.useMemo(
    () => filteredAreas.find((area) => area.id === selectedAreaId),
    [filteredAreas, selectedAreaId]
  );

  const visibleSiteBoundaries = React.useMemo(
    () =>
      sites.filter(
        (site) => Boolean(site.geoJson) && (!siteId || site.id === siteId)
      ),
    [siteId, sites]
  );

  React.useEffect(() => {
    if (selectedAreaId && !filteredAreas.some((area) => area.id === selectedAreaId)) {
      setSelectedAreaId('');
    }
  }, [filteredAreas, selectedAreaId]);

  const totalArea = filteredAreas.reduce(
    (sum, area) => sum + Number(area.approximateArea || 0),
    0
  );
  const availableCount = filteredAreas.filter(
    (area) => area.occupancyStatus === 'AVAILABLE'
  ).length;
  const readyCount = filteredAreas.filter(
    (area) => area.investmentReadiness === 'READY'
  ).length;

  const resetFilters = () => {
    setSearch('');
    setSiteId('');
    setStatus('');
    setReadiness('');
    setSelectedAreaId('');
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        <div>
          <Button
            variant="ghost"
            className="mb-2 px-0"
            onClick={() => navigate('/investments')}
          >
            <ArrowRight className="me-2 h-4 w-4" />
            المساحات والفرص الاستثمارية
          </Button>
          <h1 className="text-2xl font-bold">الخريطة الاستثمارية الموحدة</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            عرض المساحات الاستثمارية على خريطة تفاعلية حسب الموقع والحالة
            وجاهزية الاستثمار.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => navigate('/investments/gis-audit')}
          >
            <ShieldCheck className="me-2 h-4 w-4" />
            تدقيق جودة GIS
          </Button>
          {canEdit && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => navigate('/investments/geometry-import')}
            >
              <FileUp className="me-2 h-4 w-4" />
              استيراد GIS جماعي
            </Button>
          )}
          <Button
            size="sm"
            variant={mapLayer === 'street' ? 'default' : 'outline'}
            onClick={() => setMapLayer('street')}
          >
            <Navigation className="me-2 h-4 w-4" />
            خريطة
          </Button>
          <Button
            size="sm"
            variant={mapLayer === 'satellite' ? 'default' : 'outline'}
            onClick={() => setMapLayer('satellite')}
          >
            <Layers className="me-2 h-4 w-4" />
            قمر صناعي
          </Button>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">المساحات على الخريطة</CardTitle>
          </CardHeader>
          <CardContent className="text-3xl font-bold">
            {filteredAreas.length}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">المتاحة</CardTitle>
          </CardHeader>
          <CardContent className="text-3xl font-bold">
            {availableCount}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">جاهزة للاستثمار</CardTitle>
          </CardHeader>
          <CardContent className="text-3xl font-bold">
            {readyCount}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">إجمالي المساحة التقريبية</CardTitle>
          </CardHeader>
          <CardContent className="text-xl font-bold">
            {totalArea.toLocaleString('ar-SA', { maximumFractionDigits: 2 })} م²
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="grid gap-3 xl:grid-cols-[minmax(0,1.5fr)_minmax(190px,1fr)_minmax(170px,.8fr)_minmax(180px,.9fr)_auto]">
            <div className="relative">
              <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                className="pr-9"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="بحث بالرمز أو الموقع أو الصك..."
              />
            </div>

            <NativeSelect
              value={siteId}
              onChange={(event) => setSiteId(event.target.value)}
            >
              <option value="">جميع المواقع الرئيسية</option>
              {sites.map((site) => (
                <option key={site.id} value={site.id}>
                  {site.name}
                </option>
              ))}
            </NativeSelect>

            <NativeSelect
              value={status}
              onChange={(event) =>
                setStatus(event.target.value as InvestmentAreaStatus | '')
              }
            >
              <option value="">جميع حالات المساحة</option>
              {Object.entries(statusLabels).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </NativeSelect>

            <NativeSelect
              value={readiness}
              onChange={(event) =>
                setReadiness(event.target.value as InvestmentReadiness | '')
              }
            >
              <option value="">جميع حالات الجاهزية</option>
              {Object.entries(readinessLabels).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </NativeSelect>

            <Button variant="outline" onClick={resetFilters}>
              <ListFilter className="me-2 h-4 w-4" />
              مسح الفلاتر
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
        <Card className="overflow-hidden">
          <CardContent className="p-0">
            <div className="h-[660px] w-full">
              <MapContainer
                center={DEFAULT_CENTER}
                zoom={12}
                scrollWheelZoom
                style={{ height: '100%', width: '100%' }}
              >
                {mapLayer === 'street' ? (
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

                <FitVisibleAreas areas={filteredAreas} />
                <FocusSelectedArea area={selectedArea} />

                {visibleSiteBoundaries.map((site) => (
                  <GeoJSON
                    key={`site-boundary-${site.id}`}
                    data={site.geoJson as any}
                    style={{
                      color: '#0f4c81',
                      weight: 3,
                      dashArray: '8 6',
                      fillColor: '#0ea5e9',
                      fillOpacity: 0.035,
                    }}
                  >
                    <Popup>
                      <div dir="rtl" className="min-w-[220px] text-right">
                        <div className="font-bold">{site.name}</div>
                        <div className="mt-1 text-xs">
                          حدود الموقع الرئيسي — {site.code}
                        </div>
                        <button
                          type="button"
                          className="mt-3 rounded border px-2 py-1 text-xs"
                          onClick={() =>
                            navigate(`/investments/sites/${site.id}/edit`)
                          }
                        >
                          فتح حدود الموقع
                        </button>
                      </div>
                    </Popup>
                  </GeoJSON>
                ))}

                {filteredAreas.map((area) => {
                  const point = getPoint(area);
                  const color = statusColors[area.occupancyStatus];
                  const selected = selectedAreaId === area.id;

                  return (
                    <React.Fragment key={area.id}>
                      {area.geoJson && (
                        <GeoJSON
                          data={area.geoJson as any}
                          style={{
                            color,
                            weight: selected ? 4 : 2,
                            fillColor: color,
                            fillOpacity: selected ? 0.28 : 0.14,
                          }}
                          eventHandlers={{
                            click: () => setSelectedAreaId(area.id),
                          }}
                        />
                      )}

                      {point && (
                        <CircleMarker
                          center={point}
                          radius={selected ? 11 : 8}
                          pathOptions={{
                            color: selected ? '#111827' : '#ffffff',
                            weight: selected ? 4 : 2,
                            fillColor: color,
                            fillOpacity: 0.95,
                          }}
                          eventHandlers={{
                            click: () => setSelectedAreaId(area.id),
                          }}
                        >
                          <Popup>
                            <div dir="rtl" className="min-w-[210px] text-right">
                              <div className="font-bold">{area.areaCode}</div>
                              <div className="mt-1 text-sm">
                                {area.site?.name || '-'}
                              </div>
                              <div className="mt-2 text-xs">
                                {area.approximateArea == null
                                  ? 'المساحة غير مدخلة'
                                  : `${Number(area.approximateArea).toLocaleString('ar-SA')} م²`}
                              </div>
                              <button
                                type="button"
                                className="mt-3 rounded border px-2 py-1 text-xs"
                                onClick={() =>
                                  navigate(`/investments/areas/${area.id}`)
                                }
                              >
                                فتح التفاصيل
                              </button>
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

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">دليل الحالات</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-2">
              <div className="col-span-2 mb-1 flex items-center gap-2 rounded-lg border bg-sky-50/50 p-2 text-xs">
                <span className="w-6 border-t-2 border-dashed border-sky-800" />
                <span>خط أزرق متقطع: حدود الموقع الرئيسي</span>
              </div>
              {Object.entries(statusLabels).map(([value, label]) => (
                <div key={value} className="flex items-center gap-2 text-xs">
                  <span
                    className="h-3 w-3 rounded-full border border-white shadow-sm"
                    style={{
                      backgroundColor:
                        statusColors[value as InvestmentAreaStatus],
                    }}
                  />
                  <span>{label}</span>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="overflow-hidden">
            <CardHeader>
              <CardTitle className="text-base">
                المساحات الظاهرة ({filteredAreas.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="max-h-[440px] space-y-2 overflow-y-auto">
              {loading && (
                <p className="py-8 text-center text-sm text-muted-foreground">
                  جارٍ تحميل المواقع...
                </p>
              )}

              {!loading && filteredAreas.length === 0 && (
                <div className="py-8 text-center">
                  <MapPin className="mx-auto mb-2 h-8 w-8 text-muted-foreground" />
                  <p className="text-sm font-medium">
                    لا توجد مساحات بإحداثيات مطابقة للفلاتر.
                  </p>
                </div>
              )}

              {filteredAreas.map((area) => {
                const selected = selectedAreaId === area.id;

                return (
                  <button
                    key={area.id}
                    type="button"
                    onClick={() => setSelectedAreaId(area.id)}
                    className={[
                      'w-full rounded-xl border p-3 text-right transition',
                      selected
                        ? 'border-primary bg-primary/5 shadow-sm'
                        : 'hover:bg-muted/50',
                    ].join(' ')}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="font-semibold">{area.areaCode}</div>
                        <div className="mt-1 text-xs text-muted-foreground">
                          {area.site?.name || '-'}
                        </div>
                      </div>
                      <span
                        className="mt-1 h-3 w-3 shrink-0 rounded-full"
                        style={{
                          backgroundColor:
                            statusColors[area.occupancyStatus],
                        }}
                      />
                    </div>
                    <div className="mt-2 flex flex-wrap gap-1">
                      <Badge variant="outline">
                        {statusLabels[area.occupancyStatus]}
                      </Badge>
                      <Badge variant="secondary">
                        {readinessLabels[area.investmentReadiness]}
                      </Badge>
                    </div>
                    <div className="mt-2 text-xs text-muted-foreground">
                      {area.approximateArea == null
                        ? 'المساحة غير مدخلة'
                        : `${Number(area.approximateArea).toLocaleString('ar-SA')} م²`}
                    </div>
                  </button>
                );
              })}
            </CardContent>
          </Card>
        </div>
      </div>

      {selectedArea && (
        <Card>
          <CardHeader>
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <CardTitle>
                  {selectedArea.areaCode} — {selectedArea.site?.name || 'الموقع'}
                </CardTitle>
                <p className="mt-1 text-sm text-muted-foreground">
                  {selectedArea.site?.deed?.deedNumber
                    ? `الصك: ${selectedArea.site.deed.deedNumber}`
                    : 'لا يوجد صك رئيسي ظاهر'}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                {getPoint(selectedArea) && (
                  <Button
                    variant="outline"
                    onClick={() => {
                      const point = getPoint(selectedArea)!;
                      openGoogleMapsLocation(
                        { latitude: point[0], longitude: point[1] },
                        true
                      );
                    }}
                  >
                    <Navigation className="me-2 h-4 w-4" />
                    فتح في خرائط Google
                  </Button>
                )}
                <Button
                  onClick={() =>
                    navigate(`/investments/areas/${selectedArea.id}`)
                  }
                >
                  <Eye className="me-2 h-4 w-4" />
                  فتح بطاقة المساحة
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
            <div>
              <p className="text-xs text-muted-foreground">الحالة</p>
              <p className="mt-1 font-semibold">
                {statusLabels[selectedArea.occupancyStatus]}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">جاهزية الاستثمار</p>
              <p className="mt-1 font-semibold">
                {readinessLabels[selectedArea.investmentReadiness]}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">المساحة التقريبية</p>
              <p className="mt-1 font-semibold">
                {selectedArea.approximateArea == null
                  ? '-'
                  : `${Number(selectedArea.approximateArea).toLocaleString('ar-SA')} م²`}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">الاستخدام الحالي</p>
              <p className="mt-1 font-semibold">
                {selectedArea.currentUse || '-'}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">الاستخدام المقترح</p>
              <p className="mt-1 font-semibold">
                {selectedArea.proposedUse || '-'}
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
