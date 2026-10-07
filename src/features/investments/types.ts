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
  entityType: 'investment_site' | 'investment_area' | 'investment_opportunity';
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


export type InvestmentExecutiveBlockerCode =
  | 'MISSING_DEED'
  | 'MISSING_SITE_BOUNDARY'
  | 'SITE_BOUNDARY_NOT_APPROVED'
  | 'AREA_NOT_AVAILABLE'
  | 'READINESS_NOT_READY'
  | 'MISSING_AREA_BOUNDARY'
  | 'AREA_BOUNDARY_NOT_APPROVED'
  | 'MISSING_SURVEYED_AREA'
  | 'MISSING_PROPOSED_USE';

export interface InvestmentExecutiveAreaSummary {
  id: string;
  siteId: string;
  siteCode: string;
  siteName: string;
  areaCode: string;
  name?: string | null;
  approximateArea: number;
  surveyedArea: number;
  referenceArea: number;
  occupancyStatus: InvestmentAreaStatus;
  investmentReadiness: InvestmentReadiness;
  geometryApprovalStatus: GeometryApprovalStatus;
  geometryAccuracy: GeometryAccuracy;
  hasPolygon: boolean;
  proposedUse?: string | null;
  blockers: InvestmentExecutiveBlockerCode[];
  blockerCount: number;
  completionPercent: number;
  opportunityCandidate: boolean;
  activeOpportunity?: {
    id: string;
    opportunityNumber: string;
    status: InvestmentOpportunityStatus;
    estimatedValue?: number | string | null;
  } | null;
  availableForOpportunityCreation?: boolean;
  updatedAt: string;
}

export interface InvestmentExecutiveSiteSummary {
  id: string;
  code: string;
  name: string;
  deedCount: number;
  deedLinked: boolean;
  siteHasBoundary: boolean;
  siteBoundaryApproved: boolean;
  geometryApprovalStatus: GeometryApprovalStatus;
  geometryAccuracy: GeometryAccuracy;
  areaCount: number;
  availableCount: number;
  readyCount: number;
  polygonCount: number;
  approvedGeometryCount: number;
  candidateCount: number;
  candidateArea: number;
  totalApproximateArea: number;
  totalReferenceArea: number;
  completionPercent: number;
  blockerCount: number;
  blockerCounts: Partial<Record<InvestmentExecutiveBlockerCode, number>>;
}

export interface InvestmentExecutiveDashboard {
  generatedAt: string;
  methodology: {
    name: string;
    description: string;
    requiredChecks: InvestmentExecutiveBlockerCode[];
  };
  kpis: {
    siteCount: number;
    areaCount: number;
    totalApproximateArea: number;
    totalReferenceArea: number;
    availableAreaCount: number;
    availableReferenceArea: number;
    readyAreaCount: number;
    readyReferenceArea: number;
    availableAndReadyAreaCount: number;
    availableAndReadyReferenceArea: number;
    opportunityCandidateCount: number;
    opportunityCandidateArea: number;
    activeOpportunityCount: number;
    investedOpportunityCount: number;
    activeOpportunityEstimatedValue: number;
    blockedAreaCount: number;
    deedLinkedSiteCount: number;
    siteBoundaryCount: number;
    approvedSiteBoundaryCount: number;
    areaPolygonCount: number;
    approvedAreaGeometryCount: number;
    surveyedAreaCount: number;
    proposedUseCount: number;
    operationalCompletionPercent: number;
  };
  distributions: {
    readiness: Array<{ status: InvestmentReadiness; label: string; count: number }>;
    occupancy: Array<{ status: InvestmentAreaStatus; label: string; count: number }>;
    geometryApproval: Array<{
      status: GeometryApprovalStatus;
      label: string;
      count: number;
    }>;
  };
  blockers: Array<{
    code: InvestmentExecutiveBlockerCode;
    count: number;
    label: string;
    severity: 'critical' | 'warning';
  }>;
  siteRanking: InvestmentExecutiveSiteSummary[];
  closestToOpportunity: InvestmentExecutiveAreaSummary[];
  candidates: InvestmentExecutiveAreaSummary[];
}


export type InvestmentOpportunityStatus =
  | 'IDENTIFIED'
  | 'UNDER_STUDY'
  | 'PENDING_APPROVAL'
  | 'APPROVED'
  | 'OFFERED'
  | 'NEGOTIATION'
  | 'INVESTED'
  | 'REJECTED'
  | 'CANCELLED';

export interface InvestmentOpportunityEvent {
  id: string;
  opportunityId: string;
  fromStatus?: InvestmentOpportunityStatus | null;
  toStatus: InvestmentOpportunityStatus;
  action: string;
  note?: string | null;
  changedById?: string | null;
  changedByName?: string | null;
  createdAt: string;
}

export interface InvestmentOpportunity {
  id: string;
  opportunityNumber: string;
  areaId: string;
  area?: InvestmentArea;
  title: string;
  investmentUse?: string | null;
  projectDescription?: string | null;
  allocatedArea?: number | string | null;
  durationMonths?: number | null;
  estimatedValue?: number | string | null;
  currency: string;
  status: InvestmentOpportunityStatus;
  statusChangedAt: string;
  submittedAt?: string | null;
  approvedAt?: string | null;
  offeredAt?: string | null;
  investedAt?: string | null;
  cancelledAt?: string | null;
  approvedById?: string | null;
  approvedByName?: string | null;
  notes?: string | null;
  isActive: boolean;
  createdById?: string | null;
  createdByName?: string | null;
  createdAt: string;
  updatedAt: string;
  events?: InvestmentOpportunityEvent[];
  _count?: { events: number };
}

export interface InvestmentOpportunityInput {
  areaId: string;
  title: string;
  investmentUse?: string | null;
  projectDescription?: string | null;
  allocatedArea?: number | null;
  durationMonths?: number | null;
  estimatedValue?: number | null;
  currency?: string;
  notes?: string | null;
}

export interface InvestmentOpportunityListResponse {
  items: InvestmentOpportunity[];
  stats: {
    total: number;
    identified: number;
    underStudy: number;
    pendingApproval: number;
    approved: number;
    offered: number;
    negotiation: number;
    invested: number;
    rejected: number;
    cancelled: number;
    totalEstimatedValue: number;
    investedEstimatedValue: number;
    allocatedArea: number;
  };
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export interface EligibleInvestmentArea {
  id: string;
  areaCode: string;
  name?: string | null;
  surveyedArea?: number | string | null;
  approximateArea?: number | string | null;
  proposedUse?: string | null;
  site: {
    id: string;
    code: string;
    name: string;
  };
  eligible: boolean;
  blockers: string[];
  activeOpportunity?: {
    id: string;
    opportunityNumber: string;
    status: InvestmentOpportunityStatus;
  } | null;
}
