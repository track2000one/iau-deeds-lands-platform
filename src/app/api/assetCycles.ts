import { apiJson } from '../../lib/http';

export type AssetCycleComparison = {
  cycleId: string;
  basedOnCycleId?: string | null;
  totalBase: number;
  totalTarget: number;
  new: number;
  modified: number;
  unchanged: number;
  baseline: number;
  manual: number;
  needsReview: number;
  removed: number;
  removedRecords?: Array<{
    id: string;
    stableKey?: string | null;
    itemNumber?: string | null;
    name?: string | null;
    department?: string | null;
    assetId?: string | null;
  }>;
};

export type AssetUpdateCycle = {
  id: string;
  cycleNumber: number;
  name: string;
  description?: string | null;
  status: 'draft' | 'under_review' | 'approved' | 'archived' | string;
  isCurrent: boolean;
  basedOnCycleId?: string | null;
  sourceFileNames?: string[] | null;
  importedAt?: string | null;
  importedBy?: string | null;
  reviewedAt?: string | null;
  reviewedBy?: string | null;
  approvedAt?: string | null;
  approvedBy?: string | null;
  archivedAt?: string | null;
  createdBy?: string | null;
  createdAt: string;
  updatedAt: string;
  recordCount: number;
  comparison?: AssetCycleComparison | null;
};

export type AssetCycleRecord = {
  id: string;
  cycleId: string;
  assetId?: string | null;
  stableKey: string;
  sourceFingerprint?: string | null;
  changeType: string;
  reviewStatus: string;
  previousRecordId?: string | null;
  itemNumber?: string | null;
  assetNumber?: string | null;
  barcode?: string | null;
  serialNumber?: string | null;
  cardNumber?: string | null;
  name: string;
  category: string;
  department?: string | null;
  building?: string | null;
  changedFields?: string[] | null;
  payload: Record<string, unknown>;
  sourceFileName?: string | null;
  sourceFileHash?: string | null;
  sourceSheet?: string | null;
  sourceRow?: number | null;
  reviewedBy?: string | null;
  reviewedAt?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type AssetCycleRecordsPage = {
  items: AssetCycleRecord[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

export type AssetCycleImportRow = {
  input: Record<string, unknown>;
  sourceFile?: string | null;
  sourceFileHash?: string | null;
  sourceSheet?: string | null;
  sourceRow?: number | null;
};

export type AssetCycleImportResult = {
  created: number;
  skipped: number;
  invalid: number;
  total: number;
  new: number;
  modified: number;
  unchanged: number;
  needsReview: number;
  cycle: AssetUpdateCycle;
  comparison: AssetCycleComparison;
};

export const getAssetCycles = () => apiJson<AssetUpdateCycle[]>('/api/assets/cycles');
export const getCurrentAssetCycle = () => apiJson<AssetUpdateCycle>('/api/assets/cycles/current');

export const createAssetCycle = (input: { name: string; description?: string | null }) =>
  apiJson<AssetUpdateCycle>('/api/assets/cycles', {
    method: 'POST',
    body: JSON.stringify(input),
  });

export const getAssetCycleComparison = (cycleId: string) =>
  apiJson<AssetCycleComparison>(`/api/assets/cycles/${cycleId}/comparison`);

export const getAssetCycleRecords = (
  cycleId: string,
  query: { page?: number; limit?: number; search?: string; changeType?: string; reviewStatus?: string } = {}
) => {
  const params = new URLSearchParams();
  params.set('page', String(query.page || 1));
  params.set('limit', String(query.limit || 50));
  if (query.search) params.set('search', query.search);
  if (query.changeType && query.changeType !== 'all') params.set('changeType', query.changeType);
  if (query.reviewStatus && query.reviewStatus !== 'all') params.set('reviewStatus', query.reviewStatus);
  return apiJson<AssetCycleRecordsPage>(`/api/assets/cycles/${cycleId}/records?${params.toString()}`);
};

export const previewAssetCycleRows = (cycleId: string, items: AssetCycleImportRow[]) =>
  apiJson<{ total: number; fresh: number; duplicate: number; invalid: number; new: number; modified: number; unchanged: number; needsReview: number }>(
    `/api/assets/cycles/${cycleId}/import-preview`,
    { method: 'POST', body: JSON.stringify({ items }) }
  );

export const importAssetCycleRows = (
  cycleId: string,
  items: AssetCycleImportRow[],
  sourceFileNames: string[] = []
) => apiJson<AssetCycleImportResult>(`/api/assets/cycles/${cycleId}/import`, {
  method: 'POST',
  body: JSON.stringify({ items, sourceFileNames }),
});

export const sendAssetCycleToReview = (cycleId: string) =>
  apiJson<AssetUpdateCycle>(`/api/assets/cycles/${cycleId}/review`, { method: 'POST' });

export const reopenAssetCycle = (cycleId: string) =>
  apiJson<AssetUpdateCycle>(`/api/assets/cycles/${cycleId}/reopen`, { method: 'POST' });

export const approveAssetCycle = (cycleId: string) =>
  apiJson<{ cycle: AssetUpdateCycle; comparison: AssetCycleComparison }>(`/api/assets/cycles/${cycleId}/approve`, { method: 'POST' });

export const confirmAssetCycleRecord = (cycleId: string, recordId: string) =>
  apiJson<AssetCycleRecord>(`/api/assets/cycles/${cycleId}/records/${recordId}/confirm`, { method: 'PATCH' });

export const deleteAssetCycle = (cycleId: string) =>
  apiJson<void>(`/api/assets/cycles/${cycleId}`, { method: 'DELETE' });
