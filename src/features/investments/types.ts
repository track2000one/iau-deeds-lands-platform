import type { InvestmentPolygonFeature } from './geometry';

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

export type GeometryApprovalStatus =
  | 'DRAFT'
  | 'REVIEWED'
  | 'APPROVED'
  | 'CHANGE_REQUESTED';

export interface InvestmentAttachmentSummary {
  id: string;
  entityType: 'investment_site' | 'investment_area';
  entityId: string;
  attachmentType: string;
  title: string;
  driveUrl: string;
  driveFileId?: string | null;
  mimeType?: string | null;
  notes?: string | null;
  createdAt: string;
}

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
  geoJson?: InvestmentPolygonFeature | null;
  geometryAccuracy: GeometryAccuracy;
  geometryApprovalStatus: GeometryApprovalStatus;
  geometryReviewedById?: string | null;
  geometryReviewedByName?: string | null;
  geometryReviewedAt?: string | null;
  geometryApprovedById?: string | null;
  geometryApprovedByName?: string | null;
  geometryApprovedAt?: string | null;
  geometryReferenceAttachmentId?: string | null;
  geometryWorkflowNote?: string | null;
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
  geoJson?: InvestmentPolygonFeature | null;
  geometryAccuracy: GeometryAccuracy;
  geometryApprovalStatus: GeometryApprovalStatus;
  geometryReviewedById?: string | null;
  geometryReviewedByName?: string | null;
  geometryReviewedAt?: string | null;
  geometryApprovedById?: string | null;
  geometryApprovedByName?: string | null;
  geometryApprovedAt?: string | null;
  geometryReferenceAttachmentId?: string | null;
  geometryWorkflowNote?: string | null;
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
  geoJson?: InvestmentPolygonFeature | null;
  geometryAccuracy?: GeometryAccuracy;
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


export interface GeometryApprovalQueueItem {
  entityType: 'investment_site' | 'investment_area';
  id: string;
  code: string;
  name: string;
  siteId: string;
  parentSite?: {
    id: string;
    code: string;
    name: string;
  } | null;
  childAreaCount?: number | null;
  hasGeometry: boolean;
  geometryAccuracy: GeometryAccuracy;
  geometryApprovalStatus: GeometryApprovalStatus;
  geometryReviewedById?: string | null;
  geometryReviewedByName?: string | null;
  geometryReviewedAt?: string | null;
  geometryApprovedById?: string | null;
  geometryApprovedByName?: string | null;
  geometryApprovedAt?: string | null;
  geometryReferenceAttachmentId?: string | null;
  geometryWorkflowNote?: string | null;
  updatedAt: string;
  referenceAttachment?: {
    id: string;
    title: string;
    driveUrl: string;
    attachmentType: string;
  } | null;
}

export interface GeometryApprovalQueueStats {
  total: number;
  draft: number;
  reviewed: number;
  approved: number;
  changeRequested: number;
  pendingReview: number;
  pendingApproval: number;
  actionRequired: number;
  sites: number;
  areas: number;
  approvedPercent: number;
}

export interface GeometryApprovalQueueResponse {
  items: GeometryApprovalQueueItem[];
  stats: GeometryApprovalQueueStats;
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}
