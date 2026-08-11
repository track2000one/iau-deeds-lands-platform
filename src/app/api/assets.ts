import { apiJson, authenticatedFetch } from '../../lib/http';
import type { AssetAttachment, AssetInput, AssetRecord, AssetStats } from '../../types/asset';

export const getAssets = (search = '') =>
  apiJson<AssetRecord[]>(`/api/assets${search ? `?search=${encodeURIComponent(search)}` : ''}`);

export type AssetGroupSummary = {
  key: string;
  label: string;
  count: number;
  quantity: number;
};

export type AssetListPage = {
  items: Array<AssetRecord & { attachmentsCount?: number }>;
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

export type AssetReportQuery = {
  group?: string;
  search?: string;
  category?: string;
  status?: string;
  page?: number;
  limit?: number;
  sortKey?: string;
  sortDirection?: 'asc' | 'desc';
  all?: boolean;
  dateFrom?: string;
  dateTo?: string;
};

const appendAssetFilters = (params: URLSearchParams, query: AssetReportQuery) => {
  if (query.group && query.group !== 'all') params.set('group', query.group);
  if (query.search) params.set('search', query.search);
  if (query.category && query.category !== 'all') params.set('category', query.category);
  if (query.status && query.status !== 'all') params.set('status', query.status);
  if (query.dateFrom) params.set('dateFrom', query.dateFrom);
  if (query.dateTo) params.set('dateTo', query.dateTo);
};

export const getAssetGroups = (filters: Pick<AssetReportQuery, 'search' | 'category' | 'status' | 'dateFrom' | 'dateTo'> = {}) => {
  const params = new URLSearchParams();
  appendAssetFilters(params, filters);
  const suffix = params.toString();
  return apiJson<AssetGroupSummary[]>(`/api/assets-fast/groups${suffix ? `?${suffix}` : ''}`);
};

export const getAssetListPage = ({
  group = '',
  search = '',
  page = 1,
  limit = 36,
}: {
  group?: string;
  search?: string;
  page?: number;
  limit?: number;
}) => {
  const params = new URLSearchParams();
  if (group) params.set('group', group);
  if (search) params.set('search', search);
  params.set('page', String(page));
  params.set('limit', String(limit));
  return apiJson<AssetListPage>(`/api/assets-fast/list?${params.toString()}`);
};

export const getAssetReportPage = (query: AssetReportQuery = {}) => {
  const params = new URLSearchParams();
  appendAssetFilters(params, query);
  params.set('page', String(query.page || 1));
  params.set('limit', String(query.limit || 50));
  if (query.sortKey) params.set('sortKey', query.sortKey);
  if (query.sortDirection) params.set('sortDirection', query.sortDirection);
  if (query.all) params.set('all', '1');
  return apiJson<AssetListPage>(`/api/assets-fast/report?${params.toString()}`);
};

export const getAssetStats = () => apiJson<AssetStats>('/api/assets/stats');

export const getAsset = (id: string) => apiJson<AssetRecord>(`/api/assets/${id}`);

export const createAsset = (input: AssetInput) =>
  apiJson<AssetRecord>('/api/assets', {
    method: 'POST',
    body: JSON.stringify(input),
  });

export const updateAsset = (id: string, input: AssetInput) =>
  apiJson<AssetRecord>(`/api/assets/${id}`, {
    method: 'PUT',
    body: JSON.stringify(input),
  });

export const deleteAsset = (id: string) =>
  apiJson<void>(`/api/assets/${id}`, {
    method: 'DELETE',
  });

export const uploadAssetFile = async (
  file: File,
  category: string
): Promise<AssetAttachment> => {
  const body = new FormData();
  body.append('file', file);

  const response = await authenticatedFetch('/api/uploads', {
    method: 'POST',
    headers: {
      'X-Upload-Module': 'assets',
    },
    body,
  });

  const result = await response.json().catch(() => ({}));

  if (!response.ok) {
    const rawMessage = String(result?.message || result?.error || '');

    if (rawMessage.includes('invalid_grant')) {
      throw new Error(
        'تعذر الاتصال بـ Google Drive لأن صلاحية الربط منتهية أو ملغاة. يجب تحديث بيانات Google Drive في Backend/Railway.'
      );
    }

    throw new Error(rawMessage || `تعذر رفع الملف: ${file.name}`);
  }

  if (!result?.driveUrl) {
    throw new Error(`تم رفع الملف دون إرجاع رابط: ${file.name}`);
  }

  return {
    title: file.name,
    driveUrl: result.driveUrl,
    driveFileId: result.driveFileId || null,
    mimeType: result.mimeType || file.type || null,
    notes: category,
  };
};

export type AssetSmartExtractionFields = {
  itemNumber?: string | null;
  barcode?: string | null;
  name?: string | null;
  category?: string | null;
  brand?: string | null;
  model?: string | null;
  serialNumber?: string | null;
  purchaseDate?: string | null;
  purchaseValue?: number | null;
  vatRate?: number | null;
  vatAmount?: number | null;
  purchaseValueBeforeVat?: number | null;
  purchaseValueIncludingVat?: number | null;
  department?: string | null;
  building?: string | null;
  floor?: string | null;
  room?: string | null;
  manufacturer?: string | null;
  entityName?: string | null;
  region?: string | null;
  city?: string | null;
  assetDescription?: string | null;
  supplier?: string | null;
  invoiceNumber?: string | null;
  currency?: string | null;
};

export type AssetSmartExtraction = {
  fields: AssetSmartExtractionFields;
  confidence?: number | null;
  warnings?: string[];
  summary?: string | null;
  source?: { fileName?: string; mimeType?: string; size?: number; files?: Array<{ fileName?: string; mimeType?: string; size?: number }> };
};

export const extractAssetData = async (files: File[]): Promise<AssetSmartExtraction> => {
  const body = new FormData();
  files.forEach((file) => body.append('files', file));

  const response = await authenticatedFetch('/api/assets/extract-data', {
    method: 'POST',
    body,
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(String(result?.message || result?.error || 'تعذر استخراج البيانات من الملف.'));
  }
  return result as AssetSmartExtraction;
};

export type AssetExcelTemplateMeta = {
  id: string;
  templateKey: string;
  title: string;
  fileName: string;
  driveFileId: string;
  driveUrl: string;
  mimeType?: string | null;
  fileSize?: number | null;
  uploadedBy?: string | null;
  createdAt: string;
  updatedAt: string;
};

export const getOfficialAssetExcelTemplate = () =>
  apiJson<AssetExcelTemplateMeta | null>('/api/assets/excel-template');

export const uploadOfficialAssetExcelTemplate = async (file: File) => {
  const body = new FormData();
  body.append('file', file);
  const response = await authenticatedFetch('/api/assets/excel-template', {
    method: 'POST',
    body,
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(String(result?.message || result?.error || 'تعذر رفع قالب Excel الرسمي.'));
  return result as AssetExcelTemplateMeta;
};

export const downloadOfficialAssetExcelTemplate = async () => {
  const response = await authenticatedFetch('/api/assets/excel-template/file');
  if (!response.ok) {
    const result = await response.json().catch(() => ({}));
    throw new Error(String(result?.message || result?.error || 'تعذر تنزيل قالب Excel الرسمي.'));
  }
  return response.arrayBuffer();
};
