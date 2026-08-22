import { apiJson } from '../../lib/http';
import type { AccountingTransformationCycle, AccountingTransformationInput } from '../../types/accountingTransformation';

export type AccountingBaselineResetImpact = {
  destructive: {
    cycles: number;
    records: number;
    cycleTemplateSnapshots: number;
  };
  preserved: {
    users: number;
    permissions: number;
    auditLogs: number;
    officialTemplateVersions: number;
  };
  statuses: Record<string, number>;
  currentCycle: {
    id: string;
    cycleNumber: number;
    name: string;
    status: string;
  } | null;
};

export type AccountingBaselineResetPreview = {
  fileName: string;
  sourceRows: number;
  willImport: number;
  invalid: number;
  duplicate: number;
  typeCounts: {
    land: number;
    building: number;
    fixed_asset: number;
  };
  datasetFingerprint: string;
  suggestedCycleName: string;
  impact: AccountingBaselineResetImpact;
  officialTemplate: {
    id: string;
    fileName: string;
    versionNumber: number;
  } | null;
};

export type AccountingBaselineResetResult = {
  message: string;
  cycle: AccountingTransformationCycle;
  deleted: {
    cycles: number;
    records: number;
    cycleTemplateSnapshots?: number;
  };
  imported: number;
  invalid: number;
  duplicate: number;
  typeCounts: {
    land: number;
    building: number;
    fixed_asset: number;
  };
  officialTemplate?: unknown;
};

export const previewAccountingTransformationBaselineReset = (input: {
  fileName: string;
  items: AccountingTransformationInput[];
}) => apiJson<AccountingBaselineResetPreview>('/api/accounting-transformation/admin/reset-baseline/preview', {
  method: 'POST',
  body: JSON.stringify(input),
});

export const resetAccountingTransformationBaseline = (input: {
  confirmation: string;
  fileName: string;
  cycleName: string;
  items: AccountingTransformationInput[];
  expectedImpact: AccountingBaselineResetImpact['destructive'];
  expectedDatasetFingerprint: string;
}) => apiJson<AccountingBaselineResetResult>('/api/accounting-transformation/admin/reset-baseline', {
  method: 'POST',
  body: JSON.stringify(input),
});
