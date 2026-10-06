import { apiJson } from '../../lib/http';
import type {
  InvestmentArea,
  InvestmentAreaInput,
  InvestmentAreaQuery,
  InvestmentSite,
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
  getSites: (params: { search?: string; page?: number; limit?: number } = {}) =>
    apiJson<PaginatedResponse<InvestmentSite>>(
      `/api/investment-sites${buildQuery(params)}`
    ),

  getSite: (id: string) =>
    apiJson<InvestmentSite>(`/api/investment-sites/${id}`),

  getAreas: (params: InvestmentAreaQuery = {}) =>
    apiJson<PaginatedResponse<InvestmentArea>>(
      `/api/investment-areas${buildQuery(params)}`
    ),

  getArea: (id: string) =>
    apiJson<InvestmentArea>(`/api/investment-areas/${id}`),

  createSite: (data: Partial<InvestmentSite>) =>
    apiJson<InvestmentSite>('/api/investment-sites', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  updateSite: (id: string, data: Partial<InvestmentSite>) =>
    apiJson<InvestmentSite>(`/api/investment-sites/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  archiveSite: (id: string) =>
    apiJson<void>(`/api/investment-sites/${id}`, { method: 'DELETE' }),

  createArea: (data: InvestmentAreaInput) =>
    apiJson<InvestmentArea>('/api/investment-areas', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  updateArea: (id: string, data: Partial<InvestmentAreaInput>) =>
    apiJson<InvestmentArea>(`/api/investment-areas/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  archiveArea: (id: string) =>
    apiJson<void>(`/api/investment-areas/${id}`, { method: 'DELETE' }),
};
