import type { AccountingRecordType } from '../app/config/accountingTransformationFields';

export const ACCOUNTING_BASELINE_SOURCE_SHEETS = {
  land: 'أ - الأراضي - Land',
  building: 'ب- Building - المباني',
} as const;

export type AccountingBaselineRecordType = keyof typeof ACCOUNTING_BASELINE_SOURCE_SHEETS;

export const normalizeAccountingSheetName = (value: unknown) =>
  String(value ?? '')
    .trim()
    .replace(/\s+/g, ' ');

export const baselineSourceSheetFor = (recordType: AccountingRecordType) =>
  recordType === 'land'
    ? ACCOUNTING_BASELINE_SOURCE_SHEETS.land
    : recordType === 'building'
      ? ACCOUNTING_BASELINE_SOURCE_SHEETS.building
      : null;

export const isAccountingBaselineSourceSheet = (
  recordType: AccountingRecordType,
  sourceSheet: unknown,
) => {
  const expected = baselineSourceSheetFor(recordType);
  return Boolean(expected && normalizeAccountingSheetName(sourceSheet) === normalizeAccountingSheetName(expected));
};

export const hasRequiredAccountingBaselineSheets = (sheetNames: string[]) => {
  const available = new Set(sheetNames.map(normalizeAccountingSheetName));
  return Object.values(ACCOUNTING_BASELINE_SOURCE_SHEETS)
    .every((name) => available.has(normalizeAccountingSheetName(name)));
};
