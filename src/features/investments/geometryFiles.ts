import JSZip from 'jszip';
import {
  buildPolygonFeature,
  extractOuterRing,
  type InvestmentPolygonFeature,
  type PolygonCoordinate,
} from './geometry';

const MAX_GEOMETRY_FILE_BYTES = 10 * 1024 * 1024;

const normalizePoints = (coordinates: unknown): PolygonCoordinate[] => {
  if (!Array.isArray(coordinates)) return [];

  const points: PolygonCoordinate[] = [];

  for (const coordinate of coordinates) {
    if (!Array.isArray(coordinate) || coordinate.length < 2) continue;

    const longitude = Number(coordinate[0]);
    const latitude = Number(coordinate[1]);

    if (
      !Number.isFinite(longitude) ||
      !Number.isFinite(latitude) ||
      longitude < -180 ||
      longitude > 180 ||
      latitude < -90 ||
      latitude > 90
    ) {
      continue;
    }

    points.push([
      Number(longitude.toFixed(7)),
      Number(latitude.toFixed(7)),
    ]);
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

const featureFromPoints = (points: PolygonCoordinate[]) => {
  const feature = buildPolygonFeature(points);
  if (!feature) {
    throw new Error('الملف لا يحتوي على Polygon صالح مكوّن من ثلاث نقاط على الأقل.');
  }
  return feature;
};

const findPolygonCoordinates = (value: unknown): unknown => {
  if (!value || typeof value !== 'object') return null;

  const record = value as Record<string, unknown>;
  const type = record.type;

  if (type === 'Polygon') {
    const coordinates = record.coordinates;
    return Array.isArray(coordinates) ? coordinates[0] : null;
  }

  if (type === 'MultiPolygon') {
    const coordinates = record.coordinates;
    if (!Array.isArray(coordinates)) return null;
    const firstPolygon = coordinates[0];
    return Array.isArray(firstPolygon) ? firstPolygon[0] : null;
  }

  if (type === 'Feature') {
    return findPolygonCoordinates(record.geometry);
  }

  if (type === 'FeatureCollection' && Array.isArray(record.features)) {
    for (const feature of record.features) {
      const coordinates = findPolygonCoordinates(feature);
      if (coordinates) return coordinates;
    }
  }

  if (type === 'GeometryCollection' && Array.isArray(record.geometries)) {
    for (const geometry of record.geometries) {
      const coordinates = findPolygonCoordinates(geometry);
      if (coordinates) return coordinates;
    }
  }

  return null;
};

export const parseGeoJsonText = (text: string): InvestmentPolygonFeature => {
  let value: unknown;

  try {
    value = JSON.parse(text);
  } catch {
    throw new Error('ملف GeoJSON/JSON غير صالح.');
  }

  const coordinates = findPolygonCoordinates(value);
  const points = normalizePoints(coordinates);

  return featureFromPoints(points);
};

const parseKmlCoordinatesText = (text: string) => {
  const points: PolygonCoordinate[] = [];

  for (const token of text.trim().split(/\s+/)) {
    const [longitudeValue, latitudeValue] = token.split(',');
    const longitude = Number(longitudeValue);
    const latitude = Number(latitudeValue);

    if (
      !Number.isFinite(longitude) ||
      !Number.isFinite(latitude) ||
      longitude < -180 ||
      longitude > 180 ||
      latitude < -90 ||
      latitude > 90
    ) {
      continue;
    }

    points.push([
      Number(longitude.toFixed(7)),
      Number(latitude.toFixed(7)),
    ]);
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

export const parseKmlText = (text: string): InvestmentPolygonFeature => {
  const document = new DOMParser().parseFromString(text, 'application/xml');

  if (document.querySelector('parsererror')) {
    throw new Error('ملف KML غير صالح.');
  }

  const polygons = Array.from(document.getElementsByTagName('Polygon'));

  for (const polygon of polygons) {
    const outerBoundary =
      polygon.getElementsByTagName('outerBoundaryIs')[0] || polygon;
    const coordinatesElement =
      outerBoundary.getElementsByTagName('coordinates')[0];

    if (!coordinatesElement?.textContent) continue;

    const points = parseKmlCoordinatesText(coordinatesElement.textContent);
    if (points.length >= 3) return featureFromPoints(points);
  }

  throw new Error('لم يتم العثور على Polygon صالح داخل ملف KML.');
};

export const parseGeometryFile = async (
  file: File
): Promise<InvestmentPolygonFeature> => {
  if (file.size > MAX_GEOMETRY_FILE_BYTES) {
    throw new Error('حجم ملف الحدود أكبر من الحد المسموح به (10 MB).');
  }

  const extension = file.name.toLowerCase().split('.').pop();

  if (extension === 'geojson' || extension === 'json') {
    return parseGeoJsonText(await file.text());
  }

  if (extension === 'kml') {
    return parseKmlText(await file.text());
  }

  if (extension === 'kmz') {
    let zip: JSZip;

    try {
      zip = await JSZip.loadAsync(file);
    } catch {
      throw new Error('ملف KMZ غير صالح أو تالف.');
    }

    const kmlEntry = Object.values(zip.files).find(
      (entry) => !entry.dir && entry.name.toLowerCase().endsWith('.kml')
    );

    if (!kmlEntry) {
      throw new Error('ملف KMZ لا يحتوي على ملف KML.');
    }

    const text = await kmlEntry.async('text');
    return parseKmlText(text);
  }

  throw new Error('الصيغ المدعومة هي GeoJSON وKML وKMZ فقط.');
};

const xmlEscape = (value: string) =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');

const safeFileName = (value: string) =>
  value
    .trim()
    .replace(/[^\p{L}\p{N}_-]+/gu, '-')
    .replace(/^-+|-+$/g, '') || 'investment-area';

export const geometryToKml = (
  feature: InvestmentPolygonFeature,
  name = 'Investment Area'
) => {
  const points = extractOuterRing(feature);

  if (points.length < 3) {
    throw new Error('لا توجد حدود Polygon صالحة للتصدير.');
  }

  const closed = [...points, points[0]]
    .map(([longitude, latitude]) => `${longitude},${latitude},0`)
    .join(' ');

  return `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2">
  <Document>
    <name>${xmlEscape(name)}</name>
    <Placemark>
      <name>${xmlEscape(name)}</name>
      <Polygon>
        <outerBoundaryIs>
          <LinearRing>
            <coordinates>${closed}</coordinates>
          </LinearRing>
        </outerBoundaryIs>
      </Polygon>
    </Placemark>
  </Document>
</kml>`;
};

const downloadBlob = (blob: Blob, fileName: string) => {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = fileName;
  anchor.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
};

export const downloadGeoJson = (
  feature: InvestmentPolygonFeature,
  name: string
) => {
  const fileName = `${safeFileName(name)}.geojson`;
  const blob = new Blob([JSON.stringify(feature, null, 2)], {
    type: 'application/geo+json;charset=utf-8',
  });

  downloadBlob(blob, fileName);
};

export const downloadKml = (
  feature: InvestmentPolygonFeature,
  name: string
) => {
  const fileName = `${safeFileName(name)}.kml`;
  const blob = new Blob([geometryToKml(feature, name)], {
    type: 'application/vnd.google-earth.kml+xml;charset=utf-8',
  });

  downloadBlob(blob, fileName);
};

export const downloadKmz = async (
  feature: InvestmentPolygonFeature,
  name: string
) => {
  const fileName = `${safeFileName(name)}.kmz`;
  const zip = new JSZip();
  zip.file('doc.kml', geometryToKml(feature, name));

  const blob = await zip.generateAsync({
    type: 'blob',
    compression: 'DEFLATE',
    compressionOptions: { level: 6 },
  });

  downloadBlob(blob, fileName);
};
