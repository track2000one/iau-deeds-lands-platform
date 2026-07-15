import React from 'react';
import {
  MapContainer,
  Marker,
  TileLayer,
  useMap,
  useMapEvents,
} from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

type Coordinates = {
  latitude: number;
  longitude: number;
};

type MapCoordinatePickerProps = {
  latitude?: number | null;
  longitude?: number | null;
  onChange: (coordinates: Coordinates) => void;
};

const DEFAULT_POSITION: [number, number] = [26.3927, 50.1906];

const markerIcon = L.divIcon({
  className: 'custom-map-marker',
  html: `
    <div style="
      width: 24px;
      height: 24px;
      background: #1f4e79;
      border: 3px solid #ffffff;
      border-radius: 9999px;
      box-shadow: 0 3px 10px rgba(0,0,0,.35);
    "></div>
  `,
  iconSize: [24, 24],
  iconAnchor: [12, 12],
});

const MapClickHandler: React.FC<{
  onChange: (coordinates: Coordinates) => void;
}> = ({ onChange }) => {
  useMapEvents({
    click(event) {
      onChange({
        latitude: Number(event.latlng.lat.toFixed(6)),
        longitude: Number(event.latlng.lng.toFixed(6)),
      });
    },
  });

  return null;
};

const MapViewUpdater: React.FC<{
  position: [number, number];
  zoom: number;
}> = ({ position, zoom }) => {
  const map = useMap();

  React.useEffect(() => {
    map.setView(position, zoom);
  }, [map, position, zoom]);

  return null;
};

export const MapCoordinatePicker: React.FC<MapCoordinatePickerProps> = ({
  latitude,
  longitude,
  onChange,
}) => {
  const hasCoordinates =
    typeof latitude === 'number' &&
    !Number.isNaN(latitude) &&
    typeof longitude === 'number' &&
    !Number.isNaN(longitude);

  const position: [number, number] = hasCoordinates
    ? [latitude as number, longitude as number]
    : DEFAULT_POSITION;

  const zoom = hasCoordinates ? 16 : 11;

  const useCurrentLocation = () => {
    if (!navigator.geolocation) {
      alert('المتصفح لا يدعم تحديد الموقع الحالي.');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (currentPosition) => {
        onChange({
          latitude: Number(currentPosition.coords.latitude.toFixed(6)),
          longitude: Number(currentPosition.coords.longitude.toFixed(6)),
        });
      },
      () => {
        alert('تعذر تحديد موقعك الحالي. تأكد من السماح للموقع باستخدام الموقع الجغرافي.');
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
      }
    );
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div>
          <p className="font-medium text-sm">الخريطة</p>
          <p className="text-xs text-muted-foreground">
            اضغط على الخريطة لتعبئة الإحداثيات تلقائيًا.
          </p>
        </div>

        <button
          type="button"
          onClick={useCurrentLocation}
          className="rounded-md border px-3 py-2 text-sm hover:bg-muted"
        >
          استخدام موقعي الحالي
        </button>
      </div>

      <div className="h-[320px] w-full overflow-hidden rounded-xl border bg-muted">
        <MapContainer
          center={position}
          zoom={zoom}
          scrollWheelZoom
          style={{ height: '100%', width: '100%' }}
        >
          <MapViewUpdater position={position} zoom={zoom} />

          <TileLayer
            attribution="&copy; OpenStreetMap"
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          <MapClickHandler onChange={onChange} />

          {hasCoordinates && (
            <Marker position={position} icon={markerIcon} />
          )}
        </MapContainer>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="rounded-md border bg-background px-3 py-2">
          <p className="text-xs text-muted-foreground">Latitude</p>
          <p className="font-mono text-sm">
            {hasCoordinates ? latitude?.toFixed(6) : '-'}
          </p>
        </div>

        <div className="rounded-md border bg-background px-3 py-2">
          <p className="text-xs text-muted-foreground">Longitude</p>
          <p className="font-mono text-sm">
            {hasCoordinates ? longitude?.toFixed(6) : '-'}
          </p>
        </div>
      </div>
    </div>
  );
};
