export type FieldVisitRecoverySnapshot<T> = {
  username: string;
  form: T;
  editingVisitId: string | null;
  savedAt: string;
};

const STORAGE_PREFIX = 'iau:mosque-field-visit:draft-recovery:v2:';
const MAX_DRAFT_AGE_MS = 30 * 24 * 60 * 60 * 1000;

export const makeFieldVisitEmergencyKey = (username: string) =>
  `${STORAGE_PREFIX}${String(username || 'anonymous').trim() || 'anonymous'}`;

export const saveFieldVisitEmergencyDraft = <T>(
  key: string,
  snapshot: FieldVisitRecoverySnapshot<T>,
) => {
  if (typeof window === 'undefined' || !window.localStorage) return false;
  try {
    window.localStorage.setItem(key, JSON.stringify(snapshot));
    return true;
  } catch {
    return false;
  }
};

export const loadFieldVisitEmergencyDraft = <T>(
  key: string,
): FieldVisitRecoverySnapshot<T> | null => {
  if (typeof window === 'undefined' || !window.localStorage) return null;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as FieldVisitRecoverySnapshot<T>;
    if (!parsed || typeof parsed !== 'object' || !parsed.form || !parsed.savedAt) {
      window.localStorage.removeItem(key);
      return null;
    }
    const savedAtMs = Date.parse(parsed.savedAt);
    if (!Number.isFinite(savedAtMs) || Date.now() - savedAtMs > MAX_DRAFT_AGE_MS) {
      window.localStorage.removeItem(key);
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
};

export const clearFieldVisitEmergencyDraft = (key: string) => {
  if (typeof window === 'undefined' || !window.localStorage) return;
  try {
    window.localStorage.removeItem(key);
  } catch {
    // Recovery storage is best-effort and must never block the visit workflow.
  }
};

export const newestFieldVisitRecoveryDraft = <T>(
  drafts: Array<FieldVisitRecoverySnapshot<T> | null | undefined>,
  editingVisitId: string | null,
): FieldVisitRecoverySnapshot<T> | null => {
  const matching = drafts.filter((draft): draft is FieldVisitRecoverySnapshot<T> => {
    if (!draft?.form) return false;
    return (draft.editingVisitId || null) === editingVisitId;
  });
  if (!matching.length) return null;
  return matching.sort((a, b) => Date.parse(b.savedAt) - Date.parse(a.savedAt))[0] || null;
};
