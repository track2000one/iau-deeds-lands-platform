import React, { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  MapContainer,
  TileLayer,
  Marker,
  useMap,
  useMapEvents,
} from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { customMapMarkerIcon } from '../../lib/leafletIconFix';

type Coordinates = {
  latitude: number;
  longitude: number;
};

type MapCoordinatePickerProps = {
  coordinates?: Coordinates;
  onChange: (coordinates: Coordinates) => void;
};

const DEFAULT_POSITION: [number, number] = [26.3927, 50.1906];

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
  const { i18n } = useTranslation();
  const isArabic = i18n.language === 'ar';
  const ui = (ar: string, en: string) => (isArabic ? ar : en);
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
      alert(ui('المتصفح لا يدعم تحديد الموقع الحالي.', 'Your browser does not support current location detection.'));
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
        alert(ui('تعذر تحديد موقعك الحالي. تأكد من السماح للمتصفح باستخدام الموقع الجغرافي.', 'Unable to determine your current location. Make sure location access is allowed in the browser.'));
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
        @keyframes selected-location-image-pulse {
          0% {
            transform: translate(-50%, -50%) scale(.45);
            opacity: .85;
          }
          75% {
            transform: translate(-50%, -50%) scale(2.35);
            opacity: 0;
          }
          100% {
            transform: translate(-50%, -50%) scale(2.35);
            opacity: 0;
          }
        }

        .app-map-pin-icon {
          z-index: 1000 !important;
          filter:
            drop-shadow(0 8px 8px rgba(15, 23, 42, .35))
            drop-shadow(0 0 4px rgba(255, 255, 255, .95));
        }

        .app-map-pin-icon::after {
          content: '';
          position: absolute;
          left: 50%;
          top: 92%;
          width: 24px;
          height: 24px;
          transform: translate(-50%, -50%);
          border: 3px solid rgba(220, 38, 38, .72);
          border-radius: 9999px;
          animation: selected-location-image-pulse 1.8s ease-out infinite;
          pointer-events: none;
        }

        .leaflet-marker-pane {
          z-index: 650 !important;
        }
      `}</style>
      <div className="rounded-xl border bg-card p-4">
        <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h4 className="font-semibold text-sm md:text-base">
              {ui('الخريطة — اختر النقطة', 'Map — Select Location')}
            </h4>
            <p className="text-xs md:text-sm text-muted-foreground">
              {ui('اضغط على الخريطة لتعبئة الإحداثيات تلقائيًا.', 'Click the map to fill the coordinates automatically.')}
            </p>
          </div>

          <button
            type="button"
            onClick={useCurrentLocation}
            className="rounded-md border px-3 py-2 text-xs md:text-sm hover:bg-muted"
          >
            {ui('استخدام موقعي الحالي', 'Use My Current Location')}
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
                icon={customMapMarkerIcon}
                title={ui('الموقع المحدد', 'Selected Location')}
                zIndexOffset={1000}
                riseOnHover
              />
            )}
          </MapContainer>
        </div>
      </div>
    </div>
  );
};
