import React, { useEffect } from 'react';
import {
  MapContainer,
  TileLayer,
  Marker,
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
  coordinates?: Coordinates;
  onChange: (coordinates: Coordinates) => void;
};

const DEFAULT_POSITION: [number, number] = [26.3927, 50.1906];

const markerIcon = L.divIcon({
  className: 'custom-selected-location-marker',
  html: `
    <div style="
      width: 28px;
      height: 28px;
      background: #2f6f9f;
      border: 4px solid white;
      border-radius: 9999px;
      box-shadow: 0 4px 12px rgba(0,0,0,.35);
      position: relative;
    ">
      <div style="
        width: 10px;
        height: 10px;
        background: white;
        border-radius: 9999px;
        position: absolute;
        top: 5px;
        left: 5px;
      "></div>
    </div>
  `,
  iconSize: [28, 28],
  iconAnchor: [14, 14],
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

const RecenterMap: React.FC<{
  position: [number, number];
  zoom: number;
}> = ({ position, zoom }) => {
  const map = useMap();

  useEffect(() => {
    map.setView(position, zoom, {
      animate: true,
    });
  }, [map, position, zoom]);

  return null;
};

export const MapCoordinatePicker: React.FC<MapCoordinatePickerProps> = ({
  coordinates,
  onChange,
}) => {
  const hasCoordinates =
    typeof coordinates?.latitude === 'number' &&
    !Number.isNaN(coordinates.latitude) &&
    typeof coordinates?.longitude === 'number' &&
    !Number.isNaN(coordinates.longitude);

  const position: [number, number] = hasCoordinates
    ? [coordinates.latitude, coordinates.longitude]
    : DEFAULT_POSITION;

  const zoom = hasCoordinates ? 16 : 13;

  const useCurrentLocation = () => {
    if (!navigator.geolocation) {
      alert('المتصفح لا يدعم تحديد الموقع الحالي.');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        onChange({
          latitude: Number(position.coords.latitude.toFixed(6)),
          longitude: Number(position.coords.longitude.toFixed(6)),
        });
      },
      () => {
        alert('تعذر تحديد موقعك الحالي. تأكد من السماح للمتصفح باستخدام الموقع الجغرافي.');
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
      }
    );
  };

  return (
    <div className="space-y-3">
      <div className="rounded-xl border bg-card p-4">
        <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h4 className="font-semibold text-sm md:text-base">
              الخريطة — اختر النقطة
            </h4>
            <p className="text-xs md:text-sm text-muted-foreground">
              اضغط على الخريطة لتعبئة الإحداثيات تلقائيًا.
            </p>
          </div>

          <button
            type="button"
            onClick={useCurrentLocation}
            className="rounded-md border px-3 py-2 text-xs md:text-sm hover:bg-muted"
          >
            استخدام موقعي الحالي
          </button>
        </div>

        <div className="h-[360px] w-full overflow-hidden rounded-xl border bg-muted">
          <MapContainer
            center={position}
            zoom={zoom}
            scrollWheelZoom
            style={{
              height: '100%',
              width: '100%',
            }}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />

            <MapClickHandler onChange={onChange} />
            <RecenterMap position={position} zoom={zoom} />

            {hasCoordinates && (
              <Marker position={position} icon={markerIcon} />
            )}
          </MapContainer>
        </div>

        <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
          <div className="rounded-lg border bg-background px-3 py-2">
            <p className="text-xs text-muted-foreground">خط العرض Latitude</p>
            <p className="font-mono text-sm">
              {hasCoordinates ? coordinates.latitude.toFixed(6) : '-'}
            </p>
          </div>

          <div className="rounded-lg border bg-background px-3 py-2">
            <p className="text-xs text-muted-foreground">خط الطول Longitude</p>
            <p className="font-mono text-sm">
              {hasCoordinates ? coordinates.longitude.toFixed(6) : '-'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};