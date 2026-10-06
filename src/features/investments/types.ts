export type InvestmentAreaStatus =
  | 'AVAILABLE'
  | 'OCCUPIED'
  | 'PARTIALLY_OCCUPIED'
  | 'RESERVED'
  | 'ALLOCATED'
  | 'UNAVAILABLE';

export type InvestmentReadiness =
  | 'NOT_ASSESSED'
  | 'UNDER_REVIEW'
  | 'READY'
  | 'NOT_SUITABLE';

export type GeometryAccuracy =
  | 'APPROXIMATE'
  | 'FIELD_VERIFIED'
  | 'SURVEYED'
  | 'OFFICIAL';

export interface InvestmentDeedSummary {
  id: string;
  deedNumber: string;
  propertyDescription: string;
  area?: number | null;
  city?: string | null;
  district?: string | null;
  region?: string | null;
}

export interface InvestmentSiteDeedLink {
  id: string;
  deedId: string;
  isPrimary: boolean;
  deed: InvestmentDeedSummary;
}

export interface InvestmentSite {
  id: string;
  code: string;
  name: string;
  description?: string | null;
  deedId?: string | null;
  deed?: InvestmentDeedSummary | null;
  deedLinks?: InvestmentSiteDeedLink[];
  latitude?: number | string | null;
  longitude?: number | string | null;
  region?: string | null;
  city?: string | null;
  district?: string | null;
  isActive: boolean;
  _count?: { areas: number };
  areas?: InvestmentArea[];
  createdAt: string;
  updatedAt: string;
}

export interface InvestmentArea {
  id: string;
  siteId: string;
  site?: InvestmentSite;
  areaNumber: number;
  areaCode: string;
  name?: string | null;
  description?: string | null;
  approximateArea?: number | string | null;
  surveyedArea?: number | string | null;
  latitude?: number | string | null;
  longitude?: number | string | null;
  geoJson?: unknown;
  geometryAccuracy: GeometryAccuracy;
  occupancyStatus: InvestmentAreaStatus;
  investmentReadiness: InvestmentReadiness;
  currentUse?: string | null;
  proposedUse?: string | null;
  notes?: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export interface InvestmentAreaQuery {
  siteId?: string;
  status?: InvestmentAreaStatus | '';
  readiness?: InvestmentReadiness | '';
  search?: string;
  minArea?: number;
  maxArea?: number;
  page?: number;
  limit?: number;
}


export interface InvestmentAreaInput {
  siteId: string;
  areaNumber: number;
  areaCode: string;
  name?: string | null;
  description?: string | null;
  approximateArea?: number | null;
  surveyedArea?: number | null;
  latitude?: number | null;
  longitude?: number | null;
  geoJson?: unknown;
  geometryAccuracy: GeometryAccuracy;
  occupancyStatus: InvestmentAreaStatus;
  investmentReadiness: InvestmentReadiness;
  currentUse?: string | null;
  proposedUse?: string | null;
  notes?: string | null;
}

export interface InvestmentSiteInput {
  code: string;
  name: string;
  description?: string | null;
  deedId?: string | null;
  deedIds?: string[];
  latitude?: number | null;
  longitude?: number | null;
  region?: string | null;
  city?: string | null;
  district?: string | null;
}

export interface InvestmentDeedOption {
  id: string;
  deedNumber: string;
  propertyDescription: string;
  city?: string | null;
  region?: string | null;
  district?: string | null;
  area?: number | null;
}
