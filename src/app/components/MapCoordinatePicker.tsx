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
  className: 'selected-location-marker',
  html: `
    <div style="
      position: relative;
      width: 64px;
      height: 82px;
      display: flex;
      align-items: flex-start;
      justify-content: center;
      pointer-events: none;
      filter: drop-shadow(0 10px 12px rgba(15, 23, 42, .35));
    ">
      <div style="
        position: absolute;
        top: 0;
        left: 50%;
        transform: translateX(-50%) rotate(-45deg);
        width: 46px;
        height: 46px;
        border-radius: 50% 50% 50% 0;
        background: linear-gradient(145deg, #ef4444, #b91c1c);
        border: 4px solid #ffffff;
        box-shadow:
          0 0 0 3px rgba(239, 68, 68, .30),
          0 8px 20px rgba(127, 29, 29, .42);
        z-index: 3;
      "></div>

      <div style="
        position: absolute;
        top: 12px;
        left: 50%;
        transform: translateX(-50%);
        width: 17px;
        height: 17px;
        border-radius: 9999px;
        background: #ffffff;
        box-shadow: inset 0 0 0 4px rgba(127, 29, 29, .18);
        z-index: 4;
      "></div>

      <div style="
        position: absolute;
        top: 52px;
        left: 50%;
        transform: translateX(-50%);
        width: 42px;
        height: 14px;
        border-radius: 9999px;
        background: rgba(15, 23, 42, .22);
        filter: blur(2px);
        z-index: 1;
      "></div>

      <div style="
        position: absolute;
        top: 49px;
        left: 50%;
        transform: translateX(-50%);
        width: 20px;
        height: 20px;
        border-radius: 9999px;
        border: 3px solid rgba(239, 68, 68, .65);
        animation: selected-location-pulse 1.8s ease-out infinite;
        z-index: 2;
      "></div>

      <div style="
        position: absolute;
        top: 67px;
        left: 50%;
        transform: translateX(-50%);
        min-width: 96px;
        padding: 5px 9px;
        border-radius: 9999px;
        background: rgba(15, 23, 42, .94);
        border: 1px solid rgba(255,255,255,.75);
        color: #ffffff;
        font-family: Tahoma, Arial, sans-serif;
        font-size: 11px;
        font-weight: 700;
        text-align: center;
        white-space: nowrap;
        box-shadow: 0 5px 14px rgba(15,23,42,.25);
        z-index: 5;
      ">
        الموقع المحدد
      </div>
    </div>
  `,
  iconSize: [64, 88],
  iconAnchor: [32, 58],
  popupAnchor: [0, -58],
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

  const zoom = hasCoordinates ? 17 : 13;

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
      <style>{`
        @keyframes selected-location-pulse {
          0% {
            transform: translateX(-50%) scale(.55);
            opacity: .95;
          }
          70% {
            transform: translateX(-50%) scale(2.2);
            opacity: 0;
          }
          100% {
            transform: translateX(-50%) scale(2.2);
            opacity: 0;
          }
        }

        .selected-location-marker {
          background: transparent !important;
          border: 0 !important;
          overflow: visible !important;
          z-index: 1000 !important;
        }

        .leaflet-marker-pane {
          z-index: 650 !important;
        }
      `}</style>
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
              <Marker
                position={position}
                icon={markerIcon}
                title="الموقع المحدد"
                zIndexOffset={1000}
              />
            )}
          </MapContainer>
        </div>
      </div>
    </div>
  );
};
