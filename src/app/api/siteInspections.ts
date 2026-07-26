import { apiJson, authenticatedFetch } from '../../lib/http';
import type {
  InspectionAttachment,
  SiteInspection,
  SiteInspectionInput,
} from '../../types/siteInspection';

export const getSiteInspections = () =>
  apiJson<SiteInspection[]>('/api/site-inspections');

export const getSiteInspection = (id: string) =>
  apiJson<SiteInspection>(`/api/site-inspections/${id}`);

export const createSiteInspection = (input: SiteInspectionInput) =>
  apiJson<SiteInspection>('/api/site-inspections', {
    method: 'POST',
    body: JSON.stringify(input),
  });

export const updateSiteInspection = (
  id: string,
  input: SiteInspectionInput
) =>
  apiJson<SiteInspection>(`/api/site-inspections/${id}`, {
    method: 'PUT',
    body: JSON.stringify(input),
  });

export const deleteSiteInspection = (id: string) =>
  apiJson<void>(`/api/site-inspections/${id}`, {
    method: 'DELETE',
  });

export const uploadInspectionImage = async (
  file: File
): Promise<InspectionAttachment> => {
  const body = new FormData();
  body.append('file', file);

  const response = await authenticatedFetch('/api/uploads', {
    method: 'POST',
    headers: {
      'X-Upload-Module': 'site_inspections',
    },
    body,
  });

  const result = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(result?.message || 'تعذر رفع صورة المعاينة');
  }

  if (!result?.driveUrl) {
    throw new Error('تم رفع الصورة دون إرجاع رابط الملف');
  }

  return {
    title: file.name,
    driveUrl: result.driveUrl,
    driveFileId: result.driveFileId || null,
    mimeType: result.mimeType || file.type || null,
    notes: null,
  };
};
