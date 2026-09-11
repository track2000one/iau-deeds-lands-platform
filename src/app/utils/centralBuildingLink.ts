import type { MosqueBuilding } from '../api/mosques';
import type { AssetInput, AssetRecord } from '../../types/asset';
import type { AccountingTransformationRecord } from '../../types/accountingTransformation';

export const CENTRAL_BUILDING_ID_KEY = 'centralBuildingId';

export const normalizeCentralBuildingKey = (value: unknown) =>
  String(value ?? '')
    .trim()
    .toLocaleLowerCase('ar')
    .replace(/[\s\-_/\\]+/g, '');

type PayloadHolder = {
  centralBuildingId?: unknown;
  excelPayload?: Record<string, unknown> | null;
};

export const getAssetCentralBuildingId = (
  asset: PayloadHolder | Pick<AssetRecord, 'excelPayload'> | Pick<AssetInput, 'excelPayload'>
) =>
  String(
    (asset as PayloadHolder).centralBuildingId ??
      (asset as PayloadHolder).excelPayload?.[CENTRAL_BUILDING_ID_KEY] ??
      ''
  ).trim();

export const getAccountingCentralBuildingId = (
  record: Pick<AccountingTransformationRecord, 'payload'> & { centralBuildingId?: unknown }
) =>
  String(
    record.centralBuildingId ?? record.payload?.[CENTRAL_BUILDING_ID_KEY] ?? ''
  ).trim();

export const getCentralBuildingIdFromPayload = (
  payload?: Record<string, unknown> | null
) => String(payload?.[CENTRAL_BUILDING_ID_KEY] ?? '').trim();

export const withCentralBuildingId = (
  payload: Record<string, unknown> | null | undefined,
  centralBuildingId: string | null | undefined
) => {
  const next = { ...(payload || {}) };
  const id = String(centralBuildingId || '').trim();
  if (id) next[CENTRAL_BUILDING_ID_KEY] = id;
  else delete next[CENTRAL_BUILDING_ID_KEY];
  return next;
};

const uniqueMatch = (
  buildings: MosqueBuilding[],
  predicate: (building: MosqueBuilding) => boolean
) => {
  const matches = buildings.filter(predicate);
  return matches.length === 1 ? matches[0] : null;
};

export const resolveUniqueLegacyBuildingForAsset = (
  buildings: MosqueBuilding[],
  asset: Pick<AssetRecord, 'building' | 'buildingNumber'>
) => {
  const references = new Set(
    [asset.buildingNumber, asset.building]
      .map(normalizeCentralBuildingKey)
      .filter(Boolean)
  );
  if (!references.size) return null;

  return uniqueMatch(buildings, (building) => {
    const number = normalizeCentralBuildingKey(building.buildingNumber);
    const name = normalizeCentralBuildingKey(building.name);
    return Boolean(
      (number && references.has(number)) || (name && references.has(name))
    );
  });
};

export const resolveUniqueLegacyBuildingForAccounting = (
  buildings: MosqueBuilding[],
  record: Pick<
    AccountingTransformationRecord,
    'recordNumber' | 'mofAssetNumber' | 'entityAssetNumber' | 'assetDescription' | 'payload'
  >
) => {
  const numberReferences = new Set(
    [
      record.mofAssetNumber,
      record.entityAssetNumber,
      record.recordNumber,
      record.payload?.D,
      record.payload?.E,
    ]
      .map(normalizeCentralBuildingKey)
      .filter(Boolean)
  );
  const nameReferences = new Set(
    [record.assetDescription, record.payload?.G]
      .map(normalizeCentralBuildingKey)
      .filter(Boolean)
  );

  if (!numberReferences.size && !nameReferences.size) return null;

  return uniqueMatch(buildings, (building) => {
    const number = normalizeCentralBuildingKey(building.buildingNumber);
    const name = normalizeCentralBuildingKey(building.name);
    return Boolean(
      (number && numberReferences.has(number)) ||
        (name && nameReferences.has(name))
    );
  });
};

export const isAssetLinkedToCentralBuilding = (
  building: MosqueBuilding,
  asset: AssetRecord,
  buildings: MosqueBuilding[]
) => {
  const explicitId = getAssetCentralBuildingId(asset);
  if (explicitId) return explicitId === building.id;
  return resolveUniqueLegacyBuildingForAsset(buildings, asset)?.id === building.id;
};

export const isAccountingLinkedToCentralBuilding = (
  building: MosqueBuilding,
  record: AccountingTransformationRecord,
  buildings: MosqueBuilding[]
) => {
  const explicitId = getAccountingCentralBuildingId(record);
  if (explicitId) return explicitId === building.id;
  return (
    resolveUniqueLegacyBuildingForAccounting(buildings, record)?.id === building.id
  );
};
