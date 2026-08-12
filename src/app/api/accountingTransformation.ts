import { apiJson, authenticatedFetch } from '../../lib/http';
import type {
  AccountingTransformationAttachment,
  AccountingTransformationInput,
  AccountingTransformationPage,
  AccountingTransformationRecord,
  AccountingTransformationStats,
} from '../../types/accountingTransformation';

export type AccountingTransformationQuery = {
  search?: string;
  recordType?: string;
  committeeStatus?: string;
  readinessStatus?: string;
  page?: number;
  limit?: number;
  all?: boolean;
};

export const getAccountingTransformationStats = () =>
  apiJson<AccountingTransformationStats>('/api/accounting-transformation/stats');

export const getAccountingTransformationRecords = (query: AccountingTransformationQuery = {}) => {
  const params = new URLSearchParams();
  if (query.search) params.set('search', query.search);
  if (query.recordType && query.recordType !== 'all') params.set('recordType', query.recordType);
  if (query.committeeStatus && query.committeeStatus !== 'all') params.set('committeeStatus', query.committeeStatus);
  if (query.readinessStatus && query.readinessStatus !== 'all') params.set('readinessStatus', query.readinessStatus);
  if (query.page) params.set('page', String(query.page));
  if (query.limit) params.set('limit', String(query.limit));
  if (query.all) params.set('all', '1');
  const suffix = params.toString();
  return apiJson<AccountingTransformationPage>(`/api/accounting-transformation${suffix ? `?${suffix}` : ''}`);
};

export const getAccountingTransformationRecord = (id: string) =>
  apiJson<AccountingTransformationRecord>(`/api/accounting-transformation/${id}`);

export const createAccountingTransformationRecord = (input: AccountingTransformationInput) =>
  apiJson<AccountingTransformationRecord>('/api/accounting-transformation', {
    method: 'POST',
    body: JSON.stringify(input),
  });

export const updateAccountingTransformationRecord = (id: string, input: AccountingTransformationInput) =>
  apiJson<AccountingTransformationRecord>(`/api/accounting-transformation/${id}`, {
    method: 'PUT',
    body: JSON.stringify(input),
  });

export const deleteAccountingTransformationRecord = (id: string) =>
  apiJson<void>(`/api/accounting-transformation/${id}`, { method: 'DELETE' });

export const bulkImportAccountingTransformationRecords = (items: AccountingTransformationInput[]) =>
  apiJson<{ created: number; updated: number; skipped: number; total: number }>(
    '/api/accounting-transformation/bulk-import',
    { method: 'POST', body: JSON.stringify({ items }) }
  );

export const uploadAccountingTransformationFile = async (file: File): Promise<AccountingTransformationAttachment> => {
  const body = new FormData();
  body.append('file', file);
  const response = await authenticatedFetch('/api/uploads', {
    method: 'POST',
    headers: { 'X-Upload-Module': 'accounting_transformation' },
    body,
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(String(result?.message || result?.error || `تعذر رفع الملف: ${file.name}`));
  if (!result?.driveUrl) throw new Error(`تم رفع الملف دون إرجاع رابط: ${file.name}`);
  return {
    title: file.name,
    driveUrl: result.driveUrl,
    driveFileId: result.driveFileId || null,
    mimeType: result.mimeType || file.type || null,
  };
};
