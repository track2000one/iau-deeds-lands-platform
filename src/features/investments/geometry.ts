export type PolygonCoordinate = [number, number];

export interface InvestmentPolygonFeature {
  type: 'Feature';
  properties: {
    calculatedAreaSqm?: number;
    vertexCount?: number;
    calculationMethod?: string;
  };
  geometry: {
    type: 'Polygon';
    coordinates: PolygonCoordinate[][];
  };
}

const EARTH_RADIUS_METERS = 6371008.8;

const toRadians = (value: number) => (value * Math.PI) / 180;

export const extractOuterRing = (value: unknown): PolygonCoordinate[] => {
  if (!value || typeof value !== 'object') return [];

  const record = value as Record<string, unknown>;
  let geometry: Record<string, unknown> | null = null;

  if (record.type === 'Feature' && record.geometry && typeof record.geometry === 'object') {
    geometry = record.geometry as Record<string, unknown>;
  } else if (record.type === 'Polygon') {
    geometry = record;
  }

  if (!geometry || geometry.type !== 'Polygon' || !Array.isArray(geometry.coordinates)) {
    return [];
  }

  const firstRing = geometry.coordinates[0];
  if (!Array.isArray(firstRing)) return [];

  const points: PolygonCoordinate[] = [];

  for (const coordinate of firstRing) {
    if (!Array.isArray(coordinate) || coordinate.length < 2) continue;

    const longitude = Number(coordinate[0]);
    const latitude = Number(coordinate[1]);

    if (
      !Number.isFinite(latitude) ||
      !Number.isFinite(longitude) ||
      latitude < -90 ||
      latitude > 90 ||
      longitude < -180 ||
      longitude > 180
    ) {
      continue;
    }

    points.push([longitude, latitude]);
  }

  if (
    points.length >= 2 &&
    points[0][0] === points[points.length - 1][0] &&
    points[0][1] === points[points.length - 1][1]
  ) {
    points.pop();
  }

  return points;
};

export const calculatePolygonAreaSqm = (points: PolygonCoordinate[]) => {
  if (points.length < 3) return 0;

  const meanLatitude =
    points.reduce((sum, [, latitude]) => sum + latitude, 0) / points.length;
  const referenceLatitude = toRadians(meanLatitude);

  const projected = points.map(([longitude, latitude]) => ({
    x: EARTH_RADIUS_METERS * toRadians(longitude) * Math.cos(referenceLatitude),
    y: EARTH_RADIUS_METERS * toRadians(latitude),
  }));

  let twiceArea = 0;

  for (let index = 0; index < projected.length; index += 1) {
    const current = projected[index];
    const next = projected[(index + 1) % projected.length];
    twiceArea += current.x * next.y - next.x * current.y;
  }

  return Math.abs(twiceArea) / 2;
};

export const calculatePolygonCentroid = (
  points: PolygonCoordinate[]
): { latitude: number; longitude: number } | null => {
  if (points.length === 0) return null;

  const latitude =
    points.reduce((sum, [, value]) => sum + value, 0) / points.length;
  const longitude =
    points.reduce((sum, [value]) => sum + value, 0) / points.length;

  return {
    latitude: Number(latitude.toFixed(7)),
    longitude: Number(longitude.toFixed(7)),
  };
};

export const buildPolygonFeature = (
  points: PolygonCoordinate[]
): InvestmentPolygonFeature | null => {
  if (points.length < 3) return null;

  const ring = [...points, points[0]];
  const calculatedAreaSqm = Number(calculatePolygonAreaSqm(points).toFixed(2));

  return {
    type: 'Feature',
    properties: {
      calculatedAreaSqm,
      vertexCount: points.length,
      calculationMethod: 'LOCAL_EQUIRECTANGULAR_SHOELACE',
    },
    geometry: {
      type: 'Polygon',
      coordinates: [ring],
    },
  };
};

export const getPolygonMetrics = (value: unknown) => {
  const points = extractOuterRing(value);
  const calculatedAreaSqm = calculatePolygonAreaSqm(points);
  const centroid = calculatePolygonCentroid(points);

  return {
    points,
    vertexCount: points.length,
    calculatedAreaSqm,
    centroid,
    isValid: points.length >= 3,
  };
};

export const calculateDifference = (
  calculatedArea: number,
  referenceArea: number | null | undefined
) => {
  if (!referenceArea || !Number.isFinite(referenceArea) || referenceArea <= 0) {
    return null;
  }

  const differenceSqm = calculatedArea - referenceArea;
  const percentage = (differenceSqm / referenceArea) * 100;

  return {
    differenceSqm,
    percentage,
  };
};
