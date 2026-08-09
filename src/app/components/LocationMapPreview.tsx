import React from 'react';
import { useTranslation } from 'react-i18next';
import { MapContainer, Marker, TileLayer, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { customMapMarkerIcon } from '../../lib/leafletIconFix';
import { Button } from './ui/button';
import { MapPin } from 'lucide-react';

type Coordinates = {
  latitude: number;
  longitude: number;
};

type LocationMapPreviewProps = {
  coordinates?: string | Coordinates | null;
  latitude?: number | string | null;
  longitude?: number | string | null;
  title?: string;
  height?: number;
};

const parseCoordinates = (
  coordinates?: string | Coordinates | null,
  latitude?: number | string | null,
  longitude?: number | string | null
): Coordinates | null => {
  if (coordinates && typeof coordinates === 'object') {
    const lat = Number(coordinates.latitude);
    const lng = Number(coordinates.longitude);
    if (Number.isFinite(lat) && Number.isFinite(lng)) {
      return { latitude: lat, longitude: lng };
    }
  }

  if (typeof coordinates === 'string' && coordinates.trim()) {
    const [latValue, lngValue] = coordinates
      .split(',')
      .map((item) => Number(item.trim()));

    if (Number.isFinite(latValue) && Number.isFinite(lngValue)) {
      return { latitude: latValue, longitude: lngValue };
    }
  }

  const lat = Number(latitude);
  const lng = Number(longitude);

  if (Number.isFinite(lat) && Number.isFinite(lng)) {
    return { latitude: lat, longitude: lng };
  }

  return null;
};

const ResizeMap = ({ coordinates }: { coordinates: Coordinates }) => {
  const map = useMap();

  React.useEffect(() => {
    const refresh = () => {
      map.invalidateSize();
      map.setView([coordinates.latitude, coordinates.longitude], 16, {
        animate: false,
      });
    };

    const timers = [
      window.setTimeout(refresh, 0),
      window.setTimeout(refresh, 180),
      window.setTimeout(refresh, 500),
    ];

    window.addEventListener('resize', refresh);

    return () => {
      timers.forEach((timer) => window.clearTimeout(timer));
      window.removeEventListener('resize', refresh);
    };
  }, [coordinates.latitude, coordinates.longitude, map]);

  return null;
};

export const LocationMapPreview: React.FC<LocationMapPreviewProps> = ({
  coordinates,
  latitude,
  longitude,
  title,
  height = 320,
}) => {
  const { i18n } = useTranslation();
  const isArabic = i18n.language === 'ar';
  const ui = (ar: string, en: string) => (isArabic ? ar : en);
  const parsed = parseCoordinates(coordinates, latitude, longitude);

  if (!parsed) return null;

  const position: [number, number] = [parsed.latitude, parsed.longitude];
  const resolvedTitle = title || ui('الموقع على الخريطة', 'Location on Map');

  return (
    <div className="w-full min-w-0 space-y-3 rounded-2xl border bg-card p-3 sm:p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="flex items-center gap-2 font-semibold">
            <MapPin className="h-4 w-4" />
            {resolvedTitle}
          </h3>
          <p className="mt-1 text-xs text-muted-foreground" dir="ltr">
            {parsed.latitude.toFixed(6)}, {parsed.longitude.toFixed(6)}
          </p>
        </div>

        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() =>
            window.open(
              `https://www.google.com/maps/search/?api=1&query=${parsed.latitude},${parsed.longitude}`,
              '_blank',
              'noopener,noreferrer'
            )
          }
          className="w-full sm:w-auto"
        >
          <MapPin className={`${isArabic ? 'ml-2' : 'mr-2'} h-4 w-4`} />
          {ui('فتح في Google Maps', 'Open in Google Maps')}
        </Button>
      </div>

      <div className="w-full min-w-0 overflow-hidden rounded-xl border bg-muted">
        <MapContainer
          center={position}
          zoom={16}
          scrollWheelZoom={false}
          style={{ height, width: '100%', minHeight: 260 }}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <ResizeMap coordinates={parsed} />
          <Marker
            position={position}
            icon={customMapMarkerIcon}
            zIndexOffset={1000}
            title={ui('الموقع المحدد', 'Selected Location')}
          />
        </MapContainer>
      </div>
    </div>
  );
};
