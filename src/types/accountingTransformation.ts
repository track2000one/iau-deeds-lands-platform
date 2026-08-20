import type { AccountingRecordType as LegacyAccountingRecordType } from '../app/config/accountingTransformationFields';

export type AccountingRecordType = LegacyAccountingRecordType | 'fixed_asset';

export type AccountingCommitteeStatus =
  | 'not_reviewed'
  | 'under_review'
  | 'needs_update'
  | 'approved'
  | 'completed';

export type AccountingOwnershipMode = 'owned' | 'leased' | 'other';
export type AccountingCycleStatus = 'draft' | 'under_review' | 'approved' | 'archived';
export type AccountingRecordChangeType = 'baseline' | 'new' | 'modified' | 'unchanged' | 'manual' | string;

export type AccountingTransformationAttachment = {
  title: string;
  driveUrl: string;
  driveFileId?: string | null;
  mimeType?: string | null;
  notes?: string | null;
};

export type AccountingTransformationCycle = {
  id: string;
  cycleNumber: number;
  name: string;
  description?: string | null;
  status: AccountingCycleStatus;
  isCurrent: boolean;
  basedOnCycleId?: string | null;
  sourceFileName?: string | null;
  importedAt?: string | null;
  importedBy?: string | null;
  reviewedAt?: string | null;
  reviewedBy?: string | null;
  approvedAt?: string | null;
  approvedBy?: string | null;
  archivedAt?: string | null;
  createdBy?: string | null;
  createdAt: string;
  updatedAt: string;
  recordCount: number;
};

export type AccountingCycleComparison = {
  cycleId: string;
  basedOnCycleId?: string | null;
  totalBase: number;
  totalTarget: number;
  new: number;
  modified: number;
  unchanged: number;
  baseline: number;
  manual: number;
  removed: number;
  notSupplied?: number;
  removedRecords?: Array<{
    id: string;
    stableKey?: string | null;
    recordNumber: string;
    recordType: AccountingRecordType;
    entityName?: string | null;
    entityAssetNumber?: string | null;
    assetDescription?: string | null;
  }>;
};

export type AccountingTransformationRecord = {
  id: string;
  recordNumber: string;
  cycleId?: string | null;
  stableKey?: string | null;
  changeType?: AccountingRecordChangeType;
  previousRecordId?: string | null;
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
  fixedAssets?: number;
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
  truncated?: boolean;
};
