import type { MosqueFieldVisitItem } from '../api/mosques';

export const CARPET_CHECKLIST_TITLE = 'نظافة السجاد والأرضيات';
export const CARPET_REPLACEMENT_VALUE = 'needs_replacement';
export const CARPET_REPLACEMENT_NOTE = 'يحتاج إلى تغيير الفرش والسجاد';

export const isCarpetChecklistItem = (item: Pick<MosqueFieldVisitItem, 'title'>): boolean =>
  item.title === CARPET_CHECKLIST_TITLE;

export const selectedCarpetItemStatus = (item: MosqueFieldVisitItem): string =>
  isCarpetChecklistItem(item)
  && item.status === 'needs_action'
  && item.details?.carpetAssessment === 'replace'
    ? CARPET_REPLACEMENT_VALUE
    : item.status;

// Keep the backend's validated "needs_action" status unchanged.
// Store the precise choice in the item's existing JSON details field.
export const carpetStatusSelectionPatch = (
  item: MosqueFieldVisitItem,
  selected: string,
): Partial<MosqueFieldVisitItem> => {
  if (!isCarpetChecklistItem(item)) {
    return { status: selected as MosqueFieldVisitItem['status'] };
  }
  const details = { ...(item.details || {}) };
  if (selected === CARPET_REPLACEMENT_VALUE) {
    details.carpetAssessment = 'replace';
    return {
      status: 'needs_action',
      details,
      note: String(item.note || '').trim() || CARPET_REPLACEMENT_NOTE,
    };
  }

  // A cleaning-only outcome must not continue to be counted as carpet replacement.
  details.carpetAssessment = selected === 'needs_action' ? 'clean' : null;
  return {
    status: selected as MosqueFieldVisitItem['status'],
    details,
    note: item.note === CARPET_REPLACEMENT_NOTE ? '' : item.note,
  };
};
