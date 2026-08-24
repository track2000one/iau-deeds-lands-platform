import type {
  AccountingAttachmentPurpose,
  AccountingTransformationAttachment,
  AccountingTransformationRecord,
} from '../types/accountingTransformation';

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
  // Never overwrite metadata that was explicitly classified by the user.
  if (meaningful(attachment.documentPurpose) && meaningful(attachment.documentType)) return attachment;

  const title = normalized(attachment.title);
  if (/صك/.test(title)) return { ...attachment, documentPurpose: attachment.documentPurpose || 'ownership_acquisition', documentType: attachment.documentType || 'صك ملكية' };
  if (/قرار.*تخصيص|تخصيص/.test(title)) return { ...attachment, documentPurpose: attachment.documentPurpose || 'ownership_acquisition', documentType: attachment.documentType || 'قرار تخصيص' };
  if (/عقد.*بناء|بناء.*عقد/.test(title)) return { ...attachment, documentPurpose: attachment.documentPurpose || 'ownership_acquisition', documentType: attachment.documentType || 'عقد بناء' };
  if (/عقد.*شراء|شراء.*عقد/.test(title)) return { ...attachment, documentPurpose: attachment.documentPurpose || 'ownership_acquisition', documentType: attachment.documentType || 'عقد شراء' };
  if (/محضر.*استلام|استلام.*محضر/.test(title)) return { ...attachment, documentPurpose: attachment.documentPurpose || 'ownership_acquisition', documentType: attachment.documentType || 'محضر استلام' };
  if (/عقد.*ايجار|عقد.*إيجار|ايجار|إيجار/.test(title)) return { ...attachment, documentPurpose: attachment.documentPurpose || 'ownership_acquisition', documentType: attachment.documentType || 'عقد إيجار' };
  if (/صيان/.test(title)) return { ...attachment, documentPurpose: attachment.documentPurpose || 'maintenance', documentType: attachment.documentType || 'عقد صيانة' };
  if (/تقييم/.test(title)) return { ...attachment, documentPurpose: attachment.documentPurpose || 'valuation', documentType: attachment.documentType || 'تقرير تقييم' };
  if (/صوره|صورة|photo|image/.test(title)) return { ...attachment, documentPurpose: attachment.documentPurpose || 'asset_image', documentType: attachment.documentType || 'صورة أصل' };
  return { ...attachment, documentPurpose: attachment.documentPurpose || 'other' };
};

const attachmentsByPurpose = (item: AccountingTransformationRecord, purpose: AccountingAttachmentPurpose) =>
  (Array.isArray(item.attachments) ? item.attachments : [])
    // Historical attachments may predate documentPurpose/documentType. Re-classify them
    // at read/export time from their title without mutating the stored database record.
    .map(inferAccountingAttachmentMeta)
    .filter((attachment) => attachment.documentPurpose === purpose);

const attachmentValues = (
  item: AccountingTransformationRecord,
  purpose: AccountingAttachmentPurpose,
  field: 'documentType' | 'documentNumber' | 'archiveNumber',
) => Array.from(new Set(
  attachmentsByPurpose(item, purpose)
    .map((attachment) => String(attachment[field] || '').trim())
    .filter(Boolean),
));

const joinedAttachmentValue = (
  item: AccountingTransformationRecord,
  purpose: AccountingAttachmentPurpose,
  field: 'documentType' | 'documentNumber' | 'archiveNumber',
) => attachmentValues(item, purpose, field).join('، ');

const setPayloadIfMissing = (item: AccountingTransformationRecord, column: string, value: string) => {
  if (!value || meaningful(item.payload?.[column])) return;
  // This only hydrates the record object used by the client-side Excel export.
  // There is no API/database write as part of exporting the workbook.
  item.payload[column] = value;
};

const hydrateRelatedLegacySupportingMetadata = (item: AccountingTransformationRecord) => {
  if (item.recordType !== 'land' && item.recordType !== 'building') return;

  const columns = item.recordType === 'building'
    ? { valuationDocumentNumber: 'BK', maintenanceType: 'CC', maintenanceDocumentNumber: 'CD', assetImageArchive: 'CE' }
    : { valuationDocumentNumber: 'AQ', maintenanceType: 'BL', maintenanceDocumentNumber: 'BM', assetImageArchive: 'BN' };

  setPayloadIfMissing(item, columns.valuationDocumentNumber, joinedAttachmentValue(item, 'valuation', 'documentNumber'));
  setPayloadIfMissing(item, columns.maintenanceType, joinedAttachmentValue(item, 'maintenance', 'documentType'));
  setPayloadIfMissing(item, columns.maintenanceDocumentNumber, joinedAttachmentValue(item, 'maintenance', 'documentNumber'));
  setPayloadIfMissing(item, columns.assetImageArchive, joinedAttachmentValue(item, 'asset_image', 'archiveNumber'));
};

export const resolveOwnershipSupportingDocumentType = (item: AccountingTransformationRecord, existingValue: unknown) => {
  // The legacy exporter reaches the ownership-supporting-document field before the
  // later valuation/maintenance/archive fields, so hydrate those later payload cells
  // once here from the same classified attachments.
  hydrateRelatedLegacySupportingMetadata(item);

  const types = attachmentValues(item, 'ownership_acquisition', 'documentType');
  if (types.length) return types.join('، ');
  if (meaningful(existingValue)) return String(existingValue).trim();
  return 'Not Available';
};

export const resolveOwnershipSupportingArchiveNumber = (item: AccountingTransformationRecord, existingValue: unknown) => {
  const numbers = attachmentValues(item, 'ownership_acquisition', 'archiveNumber');
  if (numbers.length) return numbers.join('، ');
  return meaningful(existingValue) ? String(existingValue).trim() : '';
};
