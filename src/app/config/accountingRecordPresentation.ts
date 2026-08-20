import type { AccountingRecordType } from '../../types/accountingTransformation';
import {
  ACCOUNTING_FIELDS,
  ACCOUNTING_FIELD_GROUPS,
  ACCOUNTING_RECORD_TYPE_LABELS,
  type AccountingRecordType as LegacyAccountingRecordType,
} from './accountingTransformationFields';
import { MODEL_B_FIELDS, MODEL_B_SECTIONS } from './fixedAssetModelB';

export type AccountingDisplayField = {
  c: string;
  a: string;
  g: string;
  h?: string;
  j?: string;
  v?: string;
  automatic?: boolean;
  conditional?: boolean;
};

export const getAccountingRecordTypeLabel = (type: AccountingRecordType) =>
  type === 'fixed_asset'
    ? 'سجل الأصول الثابتة — نموذج ب'
    : ACCOUNTING_RECORD_TYPE_LABELS[type as LegacyAccountingRecordType] || type;

export const getAccountingDisplayFields = (type: AccountingRecordType): AccountingDisplayField[] => {
  if (type === 'fixed_asset') {
    return MODEL_B_FIELDS.map((field) => ({
      c: field.column,
      a: field.arabic,
      g: field.section,
      automatic: field.classification === 'automatic',
      conditional: field.classification === 'conditional',
    }));
  }
  return ACCOUNTING_FIELDS[type as LegacyAccountingRecordType].map((field) => ({ ...field }));
};

export const getAccountingDisplayGroups = (type: AccountingRecordType): Array<[string, string]> => {
  if (type === 'fixed_asset') return MODEL_B_SECTIONS.map((section) => [section.key, `${section.label} (${section.columns})`]);
  return [...ACCOUNTING_FIELD_GROUPS[type as LegacyAccountingRecordType]];
};

export const accountingIdentityValue = (type: AccountingRecordType, payload: Record<string, unknown>) => {
  if (type === 'fixed_asset') return String(payload.Y || payload.Z || payload.AB || '');
  return String(payload.E || payload.D || '');
};

export const accountingDescriptionValue = (type: AccountingRecordType, payload: Record<string, unknown>) => {
  if (type === 'fixed_asset') return String(payload.AA || '');
  return String(payload.G || '');
};
