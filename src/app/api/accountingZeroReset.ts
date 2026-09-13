import { apiJson } from '../../lib/http';

export type AccountingZeroImpact = {
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

export type AccountingZeroPreview = {
  confirmationPhrase: string;
  impact: AccountingZeroImpact;
  resultAfterReset: {
    cycles: 0;
    records: 0;
    cycleTemplateSnapshots: 0;
  };
};

export type AccountingZeroResult = {
  message: string;
  deleted: AccountingZeroImpact['destructive'];
  preserved: AccountingZeroImpact['preserved'];
  remaining: {
    cycles: number;
    records: number;
    cycleTemplateSnapshots: number;
  };
};

export const previewAccountingTransformationZeroReset = () =>
  apiJson<AccountingZeroPreview>('/api/accounting-transformation/admin/reset-empty/preview', {
    method: 'POST',
    body: JSON.stringify({}),
  });

export const executeAccountingTransformationZeroReset = (input: {
  confirmation: string;
  expectedImpact: AccountingZeroImpact['destructive'];
}) => apiJson<AccountingZeroResult>('/api/accounting-transformation/admin/reset-empty', {
  method: 'POST',
  body: JSON.stringify(input),
});
