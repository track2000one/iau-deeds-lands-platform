import { apiJson, authenticatedFetch } from '../../lib/http';
import type { AssetAttachment, AssetInput, AssetRecord, AssetStats } from '../../types/asset';

export const getAssets = (search = '') =>
  apiJson<AssetRecord[]>(`/api/assets${search ? `?search=${encodeURIComponent(search)}` : ''}`);

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
