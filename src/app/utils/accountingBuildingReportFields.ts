import type { AccountingTransformationRecord } from '../../types/accountingTransformation';

export const BUILDING_REPORT_FIELD_KEYS = [
  'buildingNumber',
  'buildingArea',
  'buildingCoordinates',
  'buildingLocation',
  'buildingUniqueNumber',
  'buildingNationalAddress',
  'buildingCardNumber',
  'buildingLandArea',
] as const;

export type BuildingReportFieldKey = typeof BUILDING_REPORT_FIELD_KEYS[number];

export const isBuildingReportField = (key: string): key is BuildingReportFieldKey =>
  (BUILDING_REPORT_FIELD_KEYS as readonly string[]).includes(key);

const filled = (value: unknown): string => {
  if (value === null || value === undefined) return '';
  return String(value).trim();
};

/**
 * Use the legacy BUILDING template's column definitions, never a land column
 * at the same letter or an unrelated fixed-asset column.
 * AN=number, AE=built area, AF=plot area, AL=region, AM=city,
 * AP=coordinates, E=entity's unique number, AO=national address, BC=card.
 */
export const getBuildingReportFieldValue = (
  item: AccountingTransformationRecord,
  key: BuildingReportFieldKey,
): string => {
  if (item.recordType !== 'building') return '-';
  const payload = item.payload || {};
  const get = (column: string, fallback?: unknown) => filled(payload[column]) || filled(fallback) || '-';

  switch (key) {
    case 'buildingNumber':
      return get('AN');
    case 'buildingArea':
      return get('AE');
    case 'buildingCoordinates':
      return get('AP');
    case 'buildingLocation': {
      const region = filled(payload.AL) || filled(item.region);
      const city = filled(payload.AM) || filled(item.city);
      const parts = [region, city].filter(Boolean);
      return [...new Set(parts)].join(' — ') || '-';
    }
    case 'buildingUniqueNumber':
      return get('E', item.entityAssetNumber);
    case 'buildingNationalAddress':
      return get('AO');
    case 'buildingCardNumber':
      return get('BC');
    case 'buildingLandArea':
      return get('AF');
  }
};
