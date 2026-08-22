import { apiJson } from '../../lib/http';
import type { AccountingTransformationCycle, AccountingTransformationInput } from '../../types/accountingTransformation';

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

export const resetAccountingTransformationBaseline = (input: {
  confirmation: string;
  fileName: string;
  cycleName: string;
  items: AccountingTransformationInput[];
}) => apiJson<AccountingBaselineResetResult>('/api/accounting-transformation/admin/reset-baseline', {
  method: 'POST',
  body: JSON.stringify(input),
});
