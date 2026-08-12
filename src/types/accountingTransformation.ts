import type { AccountingRecordType } from '../app/config/accountingTransformationFields';

export type AccountingCommitteeStatus =
  | 'not_reviewed'
  | 'under_review'
  | 'needs_update'
  | 'approved'
  | 'completed';

export type AccountingOwnershipMode = 'owned' | 'leased' | 'other';

export type AccountingTransformationAttachment = {
  title: string;
  driveUrl: string;
  driveFileId?: string | null;
  mimeType?: string | null;
  notes?: string | null;
};

export type AccountingTransformationRecord = {
  id: string;
  recordNumber: string;
  recordType: AccountingRecordType;
  ownershipMode: AccountingOwnershipMode;
  committeeStatus: AccountingCommitteeStatus;
  entityName?: string | null;
  entityCode?: string | null;
  mofAssetNumber?: string | null;
  entityAssetNumber?: string | null;
  linkedAsset?: string | null;
  assetDescription?: string | null;
  accountingGroup?: string | null;
  accountingGroupCode?: string | null;
  accountingAssetCode?: string | null;
  region?: string | null;
  city?: string | null;
  censusProgress: number;
  inventoryProgress: number;
  valuationProgress: number;
  overallProgress: number;
  readinessStatus: 'needs_data' | 'in_progress' | 'near_ready' | 'ready' | string;
  payload: Record<string, unknown>;
  attachments?: AccountingTransformationAttachment[] | null;
  notes?: string | null;
  createdBy?: string | null;
  updatedBy?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type AccountingTransformationInput = {
  recordType: AccountingRecordType;
  ownershipMode?: AccountingOwnershipMode;
  committeeStatus: AccountingCommitteeStatus;
  payload: Record<string, unknown>;
  attachments?: AccountingTransformationAttachment[];
  notes?: string | null;
};

export type AccountingTransformationStats = {
  total: number;
  lands: number;
  buildings: number;
  censusReady: number;
  inventoryReady: number;
  valuationReady: number;
  needsCompletion: number;
  underReview: number;
  averageCensus: number;
  averageInventory: number;
  averageValuation: number;
  averageOverall: number;
};

export type AccountingTransformationPage = {
  items: AccountingTransformationRecord[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};
