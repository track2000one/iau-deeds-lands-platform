import { apiJson } from '../../lib/http';
import type {
  GeometryApprovalQueueResponse,
  InvestmentArea,
  InvestmentAreaInput,
  InvestmentAttachmentSummary,
  InvestmentAreaQuery,
  InvestmentDeedOption,
  InvestmentSite,
  InvestmentSiteInput,
  PaginatedResponse,
} from './types';

const buildQuery = (params: Record<string, unknown>) => {
  const searchParams = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      searchParams.set(key, String(value));
    }
  });

  const query = searchParams.toString();
  return query ? `?${query}` : '';
};

export const investmentsApi = {
  getGeometryApprovalQueue: (params: {
    status?: 'ALL' | 'DRAFT' | 'REVIEWED' | 'APPROVED' | 'CHANGE_REQUESTED';
    entityType?: 'ALL' | 'investment_site' | 'investment_area';
    siteId?: string;
    search?: string;
    geometry?: 'with' | 'without' | 'all';
    sort?: 'priority' | 'updated_desc' | 'approved_desc';
    page?: number;
    limit?: number;
  } = {}) =>
    apiJson<GeometryApprovalQueueResponse>(
      `/api/investment-geometry-approvals${buildQuery(params)}`
    ),

  getGeometryAttachments: (
    entityType: 'investment_site' | 'investment_area',
    entityId: string
  ) =>
    apiJson<InvestmentAttachmentSummary[]>(
      `/api/attachments/${entityType}/${entityId}`
    ),

  createGeometryAttachment: (data: {
    entityType: 'investment_site' | 'investment_area';
    entityId: string;
    title: string;
    driveUrl: string;
    notes?: string | null;
  }) =>
    apiJson<InvestmentAttachmentSummary>('/api/attachments', {
      method: 'POST',
      body: JSON.stringify({
        ...data,
        attachmentType: 'survey_document',
      }),
    }),

  runGeometryWorkflow: <T>(
    entityType: 'investment_site' | 'investment_area',
    entityId: string,
    data: {
      action: 'REVIEW' | 'APPROVE' | 'REQUEST_CHANGE';
      note?: string | null;
      referenceAttachmentId?: string | null;
    }
  ) => {
    const resource =
      entityType === 'investment_site'
        ? 'investment-sites'
        : 'investment-areas';

    return apiJson<T>(
      `/api/${resource}/${entityId}/geometry-workflow`,
      {
        method: 'PATCH',
        body: JSON.stringify(data),
      }
    );
  },

  getSites: (params: { search?: string; page?: number; limit?: number } = {}) =>
    apiJson<PaginatedResponse<InvestmentSite>>(
      `/api/investment-sites${buildQuery(params)}`
    ),

  getSite: (id: string) =>
    apiJson<InvestmentSite>(`/api/investment-sites/${id}`),

  getDeedOptions: (search: string) =>
    apiJson<{ items: InvestmentDeedOption[] }>(
      `/api/investment-sites/deed-options${buildQuery({ search, limit: 20 })}`
    ),

  archiveSite: (id: string) =>
    apiJson<void>(`/api/investment-sites/${id}`, { method: 'DELETE' }),

  getAreas: (params: InvestmentAreaQuery = {}) =>
    apiJson<PaginatedResponse<InvestmentArea>>(
      `/api/investment-areas${buildQuery(params)}`
    ),

  getArea: (id: string) =>
    apiJson<InvestmentArea>(`/api/investment-areas/${id}`),

  createSite: (data: InvestmentSiteInput) =>
    apiJson<InvestmentSite>('/api/investment-sites', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  bulkUpdateSiteGeometry: (
    items: Array<{
      siteId: string;
      geoJson: InvestmentSiteInput['geoJson'];
      latitude: number;
      longitude: number;
      geometryAccuracy?: InvestmentSiteInput['geometryAccuracy'];
    }>
  ) =>
    apiJson<{
      requested: number;
      updated: number;
      items: Array<{
        id: string;
        code: string;
        name: string;
        latitude: number | string | null;
        longitude: number | string | null;
        geometryAccuracy: InvestmentSite['geometryAccuracy'];
        updatedAt: string;
      }>;
    }>('/api/investment-sites/geometry-bulk', {
      method: 'POST',
      body: JSON.stringify({ items }),
    }),

  updateSite: (id: string, data: Partial<InvestmentSiteInput>) =>
    apiJson<InvestmentSite>(`/api/investment-sites/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  bulkImportAreas: (
    siteId: string,
    areas: Array<Omit<InvestmentAreaInput, 'siteId'>>
  ) =>
    apiJson<{
      siteId: string;
      requested: number;
      created: number;
      skipped: number;
      items: InvestmentArea[];
    }>('/api/investment-areas/bulk', {
      method: 'POST',
      body: JSON.stringify({ siteId, areas }),
    }),

  bulkImportAreaBatches: (
    batches: Array<{
      siteId: string;
      areas: Array<Omit<InvestmentAreaInput, 'siteId'>>;
    }>
  ) =>
    apiJson<{
      requested: number;
      created: number;
      skipped: number;
      batches: Array<{
        siteId: string;
        siteCode: string;
        siteName: string;
        requested: number;
        created: number;
        skipped: number;
      }>;
    }>('/api/investment-areas/bulk-batch', {
      method: 'POST',
      body: JSON.stringify({ batches }),
    }),

  createArea: (data: InvestmentAreaInput) =>
    apiJson<InvestmentArea>('/api/investment-areas', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  bulkUpdateGeometry: (
    items: Array<{
      areaId: string;
      geoJson: InvestmentAreaInput['geoJson'];
      latitude: number;
      longitude: number;
      geometryAccuracy?: InvestmentAreaInput['geometryAccuracy'];
    }>
  ) =>
    apiJson<{
      requested: number;
      updated: number;
      items: Array<{
        id: string;
        areaCode: string;
        latitude: number | string | null;
        longitude: number | string | null;
        geometryAccuracy: InvestmentArea['geometryAccuracy'];
        updatedAt: string;
      }>;
    }>('/api/investment-areas/geometry-bulk', {
      method: 'POST',
      body: JSON.stringify({ items }),
    }),

  updateArea: (id: string, data: Partial<InvestmentAreaInput>) =>
    apiJson<InvestmentArea>(`/api/investment-areas/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  archiveArea: (id: string) =>
    apiJson<void>(`/api/investment-areas/${id}`, { method: 'DELETE' }),
};
