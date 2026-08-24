import type { AccountingTransformationAttachment, AccountingTransformationRecord } from '../types/accountingTransformation';

export const ACCOUNTING_ATTACHMENT_PURPOSE_OPTIONS = [
  ['ownership_acquisition', 'إثبات الملكية / الاقتناء'],
  ['maintenance', 'الصيانة'],
  ['valuation', 'التقييم'],
  ['asset_image', 'صورة الأصل'],
  ['other', 'أخرى'],
] as const;

export const ACCOUNTING_DOCUMENT_TYPE_SUGGESTIONS = [
  'صك ملكية',
  'عقد شراء',
  'عقد بناء',
  'قرار تخصيص',
  'محضر استلام',
  'عقد إيجار',
  'عقد صيانة',
  'تقرير تقييم',
  'صورة أصل',
] as const;

const normalized = (value: unknown) => String(value ?? '').trim().toLowerCase();
const meaningful = (value: unknown) => {
  const text = normalized(value);
  return Boolean(text && !['-', '—', 'غير متوفر', 'غير متاح', 'n/a', 'na', 'not available'].includes(text));
};

export const inferAccountingAttachmentMeta = (attachment: AccountingTransformationAttachment): AccountingTransformationAttachment => {
  const title = normalized(attachment.title);
  if (/صك/.test(title)) return { ...attachment, documentPurpose: 'ownership_acquisition', documentType: 'صك ملكية' };
  if (/قرار.*تخصيص|تخصيص/.test(title)) return { ...attachment, documentPurpose: 'ownership_acquisition', documentType: 'قرار تخصيص' };
  if (/عقد.*بناء|بناء.*عقد/.test(title)) return { ...attachment, documentPurpose: 'ownership_acquisition', documentType: 'عقد بناء' };
  if (/عقد.*شراء|شراء.*عقد/.test(title)) return { ...attachment, documentPurpose: 'ownership_acquisition', documentType: 'عقد شراء' };
  if (/محضر.*استلام|استلام.*محضر/.test(title)) return { ...attachment, documentPurpose: 'ownership_acquisition', documentType: 'محضر استلام' };
  if (/عقد.*ايجار|عقد.*إيجار|ايجار|إيجار/.test(title)) return { ...attachment, documentPurpose: 'ownership_acquisition', documentType: 'عقد إيجار' };
  if (/صيان/.test(title)) return { ...attachment, documentPurpose: 'maintenance', documentType: 'عقد صيانة' };
  if (/تقييم/.test(title)) return { ...attachment, documentPurpose: 'valuation', documentType: 'تقرير تقييم' };
  if (/صوره|صورة|photo|image/.test(title)) return { ...attachment, documentPurpose: 'asset_image', documentType: 'صورة أصل' };
  return { ...attachment, documentPurpose: attachment.documentPurpose || 'other' };
};

const ownershipAttachments = (item: AccountingTransformationRecord) =>
  (Array.isArray(item.attachments) ? item.attachments : []).filter((attachment) => attachment.documentPurpose === 'ownership_acquisition');

export const resolveOwnershipSupportingDocumentType = (item: AccountingTransformationRecord, existingValue: unknown) => {
  const types = Array.from(new Set(ownershipAttachments(item).map((attachment) => String(attachment.documentType || '').trim()).filter(Boolean)));
  if (types.length) return types.join('، ');
  if (meaningful(existingValue)) return String(existingValue).trim();
  return 'Not Available';
};

export const resolveOwnershipSupportingArchiveNumber = (item: AccountingTransformationRecord, existingValue: unknown) => {
  const numbers = Array.from(new Set(ownershipAttachments(item).map((attachment) => String(attachment.archiveNumber || '').trim()).filter(Boolean)));
  if (numbers.length) return numbers.join('، ');
  return meaningful(existingValue) ? String(existingValue).trim() : '';
};
