import { apiJson } from '../../lib/http';

export type AccountingAssetClassificationVersion = {
  id: string;
  versionLabel: string;
  title: string;
  sourceFileName: string;
  isCurrent: boolean;
  classificationCount: number;
  usefulLifeCount: number;
  importedBy?: string | null;
  importedAt: string;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type AccountingAssetClassificationStats = {
  version: AccountingAssetClassificationVersion | null;
  classificationCount: number;
  usefulLifeCount: number;
  level1Count: number;
  level2Count: number;
  level3Count: number;
  accountingGroupCount: number;
  newAssetCount: number;
  oldAssetCount: number;
};

export type AccountingAssetClassificationRow = {
  id: string;
  versionId: string;
  level1Code: string;
  level1Ar: string;
  level1En?: string | null;
  level2Code: string;
  level2Ar: string;
  level2En?: string | null;
  level3Code: string;
  level3Ar: string;
  level3En?: string | null;
  accountingGroupCode: string;
  accountingGroupAr: string;
  accountingGroupEn?: string | null;
  accountingAssetCode: string;
  assetCostAccountCode?: string | null;
  assetCostAccountName?: string | null;
  clearingAccountCode?: string | null;
  clearingAccountName?: string | null;
  lifecycleStatus?: string | null;
  sourceRow?: number | null;
  createdAt: string;
};

export type AccountingAssetUsefulLifeRow = {
  id: string;
  versionId: string;
  stableKey: string;
  level1Ar: string;
  level1En?: string | null;
  level2Ar: string;
  level2En?: string | null;
  level3Ar: string;
  level3En?: string | null;
  capitalizationLimit?: number | null;
  capitalizationLimitRaw?: string | null;
  minimumUsefulLife?: number | null;
  maximumUsefulLife?: number | null;
  defaultUsefulLife?: number | null;
  lifecycleStatus?: string | null;
  sourceRow?: number | null;
  createdAt: string;
};

export type AccountingAssetClassificationPage<T> = {
  items: T[];
  total: number;
  page: number;
  limit: number;
  pages: number;
  version: AccountingAssetClassificationVersion | null;
};

export type AccountingAssetClassificationOptions = {
  levels1: Array<{ level1Code: string; level1Ar: string; level1En?: string | null }>;
  accountingGroups: Array<{ accountingGroupCode: string; accountingGroupAr: string; accountingGroupEn?: string | null }>;
};

export type AccountingAssetClassificationImportRow = Omit<AccountingAssetClassificationRow, 'id' | 'versionId' | 'createdAt'>;
export type AccountingAssetUsefulLifeImportRow = Omit<AccountingAssetUsefulLifeRow, 'id' | 'versionId' | 'stableKey' | 'createdAt'>;

export type AccountingAssetClassificationImportInput = {
  versionLabel: string;
  title?: string | null;
  sourceFileName: string;
  notes?: string | null;
  classifications: AccountingAssetClassificationImportRow[];
  usefulLives: AccountingAssetUsefulLifeImportRow[];
};

const BASE = '/api/accounting-transformation/asset-classification';

const queryString = (query: Record<string, string | number | undefined | null>) => {
  const params = new URLSearchParams();
  Object.entries(query).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '' && value !== 'all') params.set(key, String(value));
  });
  const text = params.toString();
  return text ? `?${text}` : '';
};

export const getAccountingAssetClassificationStats = () =>
  apiJson<AccountingAssetClassificationStats>(`${BASE}/stats`);

export const getAccountingAssetClassificationVersions = () =>
  apiJson<AccountingAssetClassificationVersion[]>(`${BASE}/versions`);

export const getAccountingAssetClassificationOptions = () =>
  apiJson<AccountingAssetClassificationOptions>(`${BASE}/options`);

export const getAccountingAssetClassifications = (query: {
  search?: string;
  level1Code?: string;
  accountingGroupCode?: string;
  lifecycleStatus?: string;
  page?: number;
  limit?: number;
} = {}) => apiJson<AccountingAssetClassificationPage<AccountingAssetClassificationRow>>(
  `${BASE}/classifications${queryString(query)}`
);

export const getAccountingAssetUsefulLives = (query: {
  search?: string;
  lifecycleStatus?: string;
  page?: number;
  limit?: number;
} = {}) => apiJson<AccountingAssetClassificationPage<AccountingAssetUsefulLifeRow>>(
  `${BASE}/useful-lives${queryString(query)}`
);

export const importAccountingAssetClassificationCatalog = (input: AccountingAssetClassificationImportInput) =>
  apiJson<{ version: AccountingAssetClassificationVersion; imported: { classifications: number; usefulLives: number } }>(
    `${BASE}/import`,
    { method: 'POST', body: JSON.stringify(input) }
  );
