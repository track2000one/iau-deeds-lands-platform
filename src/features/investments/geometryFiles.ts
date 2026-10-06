import JSZip from 'jszip';
import {
  buildPolygonFeature,
  extractOuterRing,
  type InvestmentPolygonFeature,
  type PolygonCoordinate,
} from './geometry';

const MAX_GEOMETRY_FILE_BYTES = 10 * 1024 * 1024;

export interface ImportedGeometryItem {
  sourceName: string;
  sourceId?: string;
  feature: InvestmentPolygonFeature;
}

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

const readGeoJsonItems = (
  value: unknown,
  fallbackName = 'Polygon'
): ImportedGeometryItem[] => {
  if (!value || typeof value !== 'object') return [];

  const record = value as Record<string, unknown>;
  const type = record.type;

  if (type === 'FeatureCollection' && Array.isArray(record.features)) {
    return record.features.flatMap((feature, index) =>
      readGeoJsonItems(feature, `Feature ${index + 1}`)
    );
  }

  if (type === 'GeometryCollection' && Array.isArray(record.geometries)) {
    return record.geometries.flatMap((geometry, index) =>
      readGeoJsonItems(geometry, `Geometry ${index + 1}`)
    );
  }

  if (type === 'Feature') {
    const properties =
      record.properties && typeof record.properties === 'object'
        ? record.properties as Record<string, unknown>
        : {};
    const name = String(
      properties.areaCode ||
      properties.area_code ||
      properties.code ||
      properties.name ||
      record.id ||
      fallbackName
    ).trim();
    const sourceId = record.id == null ? undefined : String(record.id);
    const geometry = record.geometry;

    if (geometry && typeof geometry === 'object') {
      const geometryRecord = geometry as Record<string, unknown>;

      if (geometryRecord.type === 'MultiPolygon' && Array.isArray(geometryRecord.coordinates)) {
        return geometryRecord.coordinates.flatMap((polygon, index) => {
          if (!Array.isArray(polygon)) return [];
          const points = normalizePoints(polygon[0]);
          if (points.length < 3) return [];

          return [{
            sourceName: geometryRecord.coordinates.length > 1
              ? `${name} #${index + 1}`
              : name,
            sourceId,
            feature: featureFromPoints(points),
          }];
        });
      }

      const coordinates = findPolygonCoordinates(geometryRecord);
      const points = normalizePoints(coordinates);
      if (points.length >= 3) {
        return [{
          sourceName: name || fallbackName,
          sourceId,
          feature: featureFromPoints(points),
        }];
      }
    }

    return [];
  }

  if (type === 'MultiPolygon' && Array.isArray(record.coordinates)) {
    return record.coordinates.flatMap((polygon, index) => {
      if (!Array.isArray(polygon)) return [];
      const points = normalizePoints(polygon[0]);
      if (points.length < 3) return [];

      return [{
        sourceName: `${fallbackName} #${index + 1}`,
        feature: featureFromPoints(points),
      }];
    });
  }

  if (type === 'Polygon') {
    const coordinates = findPolygonCoordinates(record);
    const points = normalizePoints(coordinates);

    return points.length >= 3
      ? [{
          sourceName: fallbackName,
          feature: featureFromPoints(points),
        }]
      : [];
  }

  return [];
};

const readKmlItems = (text: string): ImportedGeometryItem[] => {
  const document = new DOMParser().parseFromString(text, 'application/xml');

  if (document.querySelector('parsererror')) {
    throw new Error('ملف KML غير صالح.');
  }

  const placemarks = Array.from(document.getElementsByTagName('Placemark'));
  const items: ImportedGeometryItem[] = [];

  for (let placemarkIndex = 0; placemarkIndex < placemarks.length; placemarkIndex += 1) {
    const placemark = placemarks[placemarkIndex];
    const name =
      placemark.getElementsByTagName('name')[0]?.textContent?.trim() ||
      `Placemark ${placemarkIndex + 1}`;
    const polygons = Array.from(placemark.getElementsByTagName('Polygon'));

    for (let polygonIndex = 0; polygonIndex < polygons.length; polygonIndex += 1) {
      const polygon = polygons[polygonIndex];
      const outerBoundary =
        polygon.getElementsByTagName('outerBoundaryIs')[0] || polygon;
      const coordinatesElement =
        outerBoundary.getElementsByTagName('coordinates')[0];

      if (!coordinatesElement?.textContent) continue;

      const points = parseKmlCoordinatesText(coordinatesElement.textContent);
      if (points.length < 3) continue;

      items.push({
        sourceName: polygons.length > 1 ? `${name} #${polygonIndex + 1}` : name,
        feature: featureFromPoints(points),
      });
    }
  }

  if (items.length === 0) {
    const polygons = Array.from(document.getElementsByTagName('Polygon'));

    for (let index = 0; index < polygons.length; index += 1) {
      const outerBoundary =
        polygons[index].getElementsByTagName('outerBoundaryIs')[0] ||
        polygons[index];
      const coordinatesElement =
        outerBoundary.getElementsByTagName('coordinates')[0];

      if (!coordinatesElement?.textContent) continue;

      const points = parseKmlCoordinatesText(coordinatesElement.textContent);
      if (points.length < 3) continue;

      items.push({
        sourceName: `Polygon ${index + 1}`,
        feature: featureFromPoints(points),
      });
    }
  }

  return items;
};

export const parseGeometryCollectionFile = async (
  file: File
): Promise<ImportedGeometryItem[]> => {
  if (file.size > MAX_GEOMETRY_FILE_BYTES) {
    throw new Error('حجم ملف الحدود أكبر من الحد المسموح به (10 MB).');
  }

  const extension = file.name.toLowerCase().split('.').pop();
  let items: ImportedGeometryItem[] = [];

  if (extension === 'geojson' || extension === 'json') {
    let value: unknown;

    try {
      value = JSON.parse(await file.text());
    } catch {
      throw new Error('ملف GeoJSON/JSON غير صالح.');
    }

    items = readGeoJsonItems(value);
  } else if (extension === 'kml') {
    items = readKmlItems(await file.text());
  } else if (extension === 'kmz') {
    let zip: JSZip;

    try {
      zip = await JSZip.loadAsync(file);
    } catch {
      throw new Error('ملف KMZ غير صالح أو تالف.');
    }

    const kmlEntries = Object.values(zip.files).filter(
      (entry) => !entry.dir && entry.name.toLowerCase().endsWith('.kml')
    );

    for (const entry of kmlEntries) {
      const text = await entry.async('text');
      items.push(...readKmlItems(text));
    }
  } else {
    throw new Error('الصيغ المدعومة هي GeoJSON وKML وKMZ فقط.');
  }

  if (items.length === 0) {
    throw new Error('لم يتم العثور على أي Polygon صالح داخل الملف.');
  }

  if (items.length > 500) {
    throw new Error('الملف يحتوي على أكثر من 500 Polygon، وهو أكبر من الحد المسموح.');
  }

  return items;
};

export const parseGeometryFile = async (
  file: File
): Promise<InvestmentPolygonFeature> => {
  const items = await parseGeometryCollectionFile(file);
  return items[0].feature;
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
