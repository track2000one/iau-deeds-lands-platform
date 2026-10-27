import React from 'react';
import { ArrowRight, Layers, MapPinned, Search } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router';
import { MapContainer, TileLayer, GeoJSON, CircleMarker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { apiJson } from '../../lib/http';
import { getPolygonMetrics } from '../../features/investments/geometry';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';

type Status = 'DRAFT' | 'UNDER_REVIEW' | 'VERIFIED_VACANT' | 'PARTIALLY_OCCUPIED' | 'OCCUPIED' | 'ALLOCATED';
type Land = {
  id: string; name: string; code: string; campus: string; status: Status;
  deed?: { deedNumber: string } | null;
  approximateArea: number | string;
  verifiedVacantArea?: number | string | null;
  latitude?: number | string | null;
  longitude?: number | string | null;
  geometryGeoJson?: unknown | null;
};
const center: [number, number] = [26.3927, 50.1906];
const labels: Record<Status, string> = {
  DRAFT: 'شاغرة مبدئيًا', UNDER_REVIEW: 'قيد التحقق', VERIFIED_VACANT: 'شاغرة معتمدة',
  PARTIALLY_OCCUPIED: 'مشغولة جزئيًا', OCCUPIED: 'مشغولة', ALLOCATED: 'مخصصة لمشروع',
};
const color: Record<Status, string> = {
  DRAFT: '#64748b', UNDER_REVIEW: '#0ea5e9', VERIFIED_VACANT: '#16a34a',
  PARTIALLY_OCCUPIED: '#eab308', OCCUPIED: '#dc2626', ALLOCATED: '#a855f7',
};
const metric = (number: number | string | null | undefined) =>
  Number(number || 0).toLocaleString('ar-SA', { maximumFractionDigits: 2 });
const location = (land: Land): [number, number] | null => {
  const geometry = getPolygonMetrics(land.geometryGeoJson);
  if (geometry.centroid) return [geometry.centroid.latitude, geometry.centroid.longitude];
  if (land.latitude == null || land.longitude == null) return null;
  const lat = Number(land.latitude), lng = Number(land.longitude);
  return Number.isFinite(lat) && Number.isFinite(lng)
    && Math.abs(lat) <= 90 && Math.abs(lng) <= 180 ? [lat, lng] : null;
};
const boundaries = (land: Land): [number, number][] =>
  getPolygonMetrics(land.geometryGeoJson).points.map(([lng, lat]) => [lat, lng]);

function FitVisible({ lands, selected }: { lands: Land[]; selected: string }) {
  const map = useMap();
  React.useEffect(() => {
    const focus = selected ? lands.find((land) => land.id === selected) : null;
    const target = focus ? [focus] : lands;
    const points = target.flatMap((land) => {
      const geometryPoints = boundaries(land);
      return geometryPoints.length ? geometryPoints : (location(land) ? [location(land)!] : []);
    });
    if (points.length > 1) map.fitBounds(points, { padding: [35, 35], maxZoom: 18, animate: true });
    else if (points.length === 1) map.setView(points[0], 17, { animate: true });
    else map.setView(center, 13, { animate: false });
    map.invalidateSize();
  }, [lands, map, selected]);
  return null;
}

export function VacantLandsMapPage() {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const selected = params.get('selected') || '';
  const [lands, setLands] = React.useState<Land[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState('');
  const [query, setQuery] = React.useState('');
  const [campus, setCampus] = React.useState('');
  const [status, setStatus] = React.useState('');
  const [layer, setLayer] = React.useState<'satellite' | 'streets'>('satellite');

  React.useEffect(() => {
    let active = true;
    apiJson<Land[]>('/api/vacant-lands')
      .then((items) => { if (active) { setLands(items); setError(''); } })
      .catch((err) => { if (active) setError(err instanceof Error ? err.message : 'تعذر تحميل المواقع'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const campuses = React.useMemo(() => [...new Set(lands.map((x) => x.campus))].sort(), [lands]);
  const shown = React.useMemo(() => lands.filter((x) =>
    (!campus || x.campus === campus)
      && (!status || x.status === status)
      && (!query.trim() || [x.code, x.name, x.campus, x.deed?.deedNumber || '']
        .some((field) => field.toLocaleLowerCase('ar').includes(query.trim().toLocaleLowerCase('ar'))))
  ), [lands, campus, status, query]);
  const mapped = React.useMemo(() => shown.filter((x) => location(x) != null), [shown]);
  const setSelected = (id: string) => setParams(id ? { selected: id } : {});

  return (
    <div dir="rtl" className="mx-auto max-w-[1650px] space-y-4 px-3 py-5 text-foreground">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-primary/20 bg-card p-4 shadow-md">
        <div className="flex items-center gap-3">
          <MapPinned className="h-7 w-7 text-primary" />
          <div>
            <h1 className="text-2xl font-bold">الخريطة التفاعلية للأراضي الشاغرة</h1>
            <p className="text-sm text-muted-foreground">حدود المواقع كما رُسمت أو استُوردت من Google Earth، وحالتها في سجل الأملاك</p>
          </div>
        </div>
        <Button variant="outline" onClick={() => navigate('/lands/vacant')}><ArrowRight className="ml-2 h-4 w-4" />العودة إلى السجل</Button>
      </div>

      <div className="grid gap-3 rounded-xl border bg-card p-3 md:grid-cols-3">
        <label className="relative">
          <Search className="absolute right-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input value={query} onChange={(e) => setQuery(e.target.value)} className="pr-9" placeholder="رمز الموقع، الاسم أو رقم الصك" />
        </label>
        <select aria-label="تصفية نطاق الجامعة" className="h-10 rounded-md border border-input bg-background px-3" value={campus} onChange={(e) => setCampus(e.target.value)}>
          <option value="">جميع النطاقات</option>
          {campuses.map((x) => <option key={x} value={x}>{x}</option>)}
        </select>
        <select aria-label="تصفية حالة الإشغال" className="h-10 rounded-md border border-input bg-background px-3" value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">جميع الحالات</option>
          {Object.entries(labels).map(([value, name]) => <option key={value} value={value}>{name}</option>)}
        </select>
      </div>

      <div className="grid gap-4 xl:grid-cols-[340px_minmax(0,1fr)]">
        <aside className="order-2 max-h-[680px] space-y-2 overflow-y-auto rounded-2xl border bg-card p-3 xl:order-1">
          <div className="mb-3 text-sm text-muted-foreground">
            المواقع المطابقة: {shown.length} · معروضة جغرافيًا: {mapped.length}
            {shown.length !== mapped.length && <p className="mt-1">المواقع دون حدود أو إحداثيات ستبقى في السجل ولا تظهر على الخريطة.</p>}
          </div>
          {loading ? <p className="p-4">جارٍ التحميل...</p> : error ? <p className="p-3 text-destructive">{error}</p> :
            shown.length === 0 ? <p className="p-4">لا توجد مواقع مسجلة تطابق المرشحات.</p> :
              shown.map((land) => <button
                key={land.id} type="button" onClick={() => setSelected(land.id)}
                className={'w-full rounded-xl border p-3 text-right transition-all hover:border-primary hover:shadow-md ' + (selected === land.id ? 'border-primary bg-primary/10' : 'bg-muted/20')}
              >
                <span className="mb-2 flex items-center justify-between gap-2">
                  <strong className="text-sm">{land.code} – {land.name}</strong>
                  <span className="h-3 w-3 shrink-0 rounded-full" style={{ background: color[land.status] }} />
                </span>
                <span className="block text-xs text-muted-foreground">{land.campus} · صك {land.deed?.deedNumber || '—'}</span>
                <span className="mt-1 block text-xs">{labels[land.status]} · {metric(land.approximateArea)} م² تقريبية</span>
                {!location(land) && <span className="mt-2 block text-xs text-amber-600">لم تحدد إحداثيات الموقع بعد</span>}
              </button>)
          }
          {selected && <Button variant="outline" className="w-full" onClick={() => setSelected('')}>عرض جميع المواقع</Button>}
        </aside>

        <div className="order-1 overflow-hidden rounded-2xl border bg-card shadow-lg xl:order-2">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b p-3">
            <span className="flex items-center gap-2 text-sm font-semibold"><Layers className="h-4 w-4" />خريطة المواقع</span>
            <div className="flex gap-2">
              <Button type="button" size="sm" variant={layer === 'satellite' ? 'default' : 'outline'} onClick={() => setLayer('satellite')}>صورة جوية</Button>
              <Button type="button" size="sm" variant={layer === 'streets' ? 'default' : 'outline'} onClick={() => setLayer('streets')}>خريطة طرق</Button>
            </div>
          </div>
          <MapContainer center={center} zoom={13} style={{ width: '100%', height: 610 }} scrollWheelZoom>
            {layer === 'satellite' ? <TileLayer attribution="Tiles &copy; Esri" url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}" /> :
              <TileLayer attribution="&copy; OpenStreetMap contributors" url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />}
            <FitVisible lands={mapped} selected={selected} />
            {mapped.map((land) => {
              const point = location(land);
              const hasPolygon = boundaries(land).length >= 3;
              return (
                <React.Fragment key={land.id}>
                  {hasPolygon && <GeoJSON key={land.id + JSON.stringify(land.geometryGeoJson)} data={land.geometryGeoJson as any}
                    style={{ color: color[land.status], weight: selected === land.id ? 5 : 3, fillOpacity: 0.2 }}
                    eventHandlers={{ click() { setSelected(land.id); } }}>
                    <Popup>
                      <strong>{land.code} – {land.name}</strong><p>{land.campus}</p>
                      <p>رقم الصك: {land.deed?.deedNumber || '—'}</p>
                      <p>المساحة الهندسية: {metric(getPolygonMetrics(land.geometryGeoJson).calculatedAreaSqm)} م² (تقديرية)</p>
                      <p>حالة الإشغال: {labels[land.status]}</p>
                    </Popup>
                  </GeoJSON>}
                  {!hasPolygon && point && <CircleMarker center={point} radius={9} pathOptions={{ color: color[land.status], weight: 3 }}>
                    <Popup><strong>{land.name}</strong><p>موقع بإحداثيات فقط؛ لم تُرسم حدوده بعد</p></Popup>
                  </CircleMarker>}
                </React.Fragment>
              );
            })}
          </MapContainer>
          <div className="flex flex-wrap gap-3 p-3 text-xs">
            {Object.entries(labels).map(([key, label]) => <span key={key} className="flex items-center gap-1">
              <span className="h-3 w-3 rounded" style={{ background: color[key as Status] }} />{label}
            </span>)}
          </div>
          <p className="border-t px-3 py-2 text-xs text-muted-foreground">الخرائط والقياسات الجغرافية أدوات حصر أولية، ولا تعد رفعًا مساحيًا معتمدًا أو إثباتًا لملكية الموقع أو شغوره.</p>
        </div>
      </div>
    </div>
  );
}
