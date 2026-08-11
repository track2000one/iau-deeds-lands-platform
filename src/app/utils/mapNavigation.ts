export type MapCoordinates = {
  latitude: number;
  longitude: number;
};

const toFiniteNumber = (value: unknown): number | null => {
  if (value === null || value === undefined || value === '') return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
};

export const normalizeMapCoordinates = (value: unknown): MapCoordinates | null => {
  if (!value) return null;

  let candidate: unknown = value;

  if (typeof candidate === 'string') {
    const trimmed = candidate.trim();
    if (!trimmed) return null;

    try {
      candidate = JSON.parse(trimmed);
    } catch {
      const parts = trimmed.split(',').map((part) => part.trim());
      if (parts.length < 2) return null;
      candidate = { latitude: parts[0], longitude: parts[1] };
    }
  }

  if (Array.isArray(candidate) && candidate.length >= 2) {
    candidate = { latitude: candidate[0], longitude: candidate[1] };
  }

  if (typeof candidate !== 'object' || candidate === null) return null;

  const record = candidate as Record<string, unknown>;
  const latitude = toFiniteNumber(record.latitude ?? record.lat ?? record.y);
  const longitude = toFiniteNumber(record.longitude ?? record.lng ?? record.lon ?? record.x);

  if (latitude === null || longitude === null) return null;
  if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) return null;

  return { latitude, longitude };
};

export const formatMapCoordinate = (value: unknown, digits = 4) => {
  const number = toFiniteNumber(value);
  return number === null ? '-' : number.toFixed(digits);
};

export const getGoogleMapsUrl = (coordinates: MapCoordinates) => {
  const query = encodeURIComponent(`${coordinates.latitude},${coordinates.longitude}`);
  return `https://www.google.com/maps/search/?api=1&query=${query}`;
};

export const shouldOpenExternalMap = () => {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') return false;

  const userAgent = navigator.userAgent || '';
  const mobileUserAgent = /Android|iPhone|iPad|iPod|Mobile/i.test(userAgent);
  const coarsePointer = Boolean(window.matchMedia?.('(pointer: coarse)').matches) && window.innerWidth <= 1180;

  return mobileUserAgent || coarsePointer;
};

export const openGoogleMapsLocation = (coordinates: MapCoordinates, newTab = false) => {
  if (typeof window === 'undefined') return;

  const url = getGoogleMapsUrl(coordinates);

  if (newTab) {
    window.open(url, '_blank', 'noopener,noreferrer');
    return;
  }

  window.location.assign(url);
};
