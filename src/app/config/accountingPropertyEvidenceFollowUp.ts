import type { PropertyEvidenceStatus } from './accountingPropertyEvidenceRequirements';

export type EvidenceFollowUpPriority = 'low' | 'medium' | 'high';
export type EvidenceFollowUpStatus = 'not_started' | 'in_progress' | 'waiting_external' | 'completed';
export type EvidenceEscalationLevel = 'normal' | 'due_soon' | 'overdue' | 'critical';

export const EVIDENCE_ESCALATION_CONFIG = {
  dueSoonDays: 7,
  criticalAfterDays: 14,
} as const;

export const EVIDENCE_ESCALATION_LABELS: Record<EvidenceEscalationLevel, string> = {
  normal: 'ضمن المدة',
  due_soon: 'قريب الاستحقاق',
  overdue: 'متأخر',
  critical: 'حرج',
};

export type EvidenceFollowUpFields = {
  responsibleParty?: string;
  dueDate?: string;
  priority?: EvidenceFollowUpPriority;
  followUpStatus?: EvidenceFollowUpStatus;
  lastAction?: string;
  lastActionAt?: string;
};

export const EVIDENCE_PRIORITY_LABELS: Record<EvidenceFollowUpPriority, string> = {
  low: 'منخفضة',
  medium: 'متوسطة',
  high: 'عالية',
};

export const EVIDENCE_FOLLOW_UP_STATUS_LABELS: Record<EvidenceFollowUpStatus, string> = {
  not_started: 'لم يبدأ',
  in_progress: 'تحت المتابعة',
  waiting_external: 'بانتظار جهة خارجية',
  completed: 'مكتمل',
};

const parseDateOnly = (value?: string) => {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime()) ? null : date;
};

export const defaultFollowUpStatus = (evidenceStatus: PropertyEvidenceStatus): EvidenceFollowUpStatus =>
  evidenceStatus === 'available' ? 'completed' : 'not_started';

export const isEvidenceTaskOpen = (
  evidenceStatus: PropertyEvidenceStatus,
  followUpStatus?: EvidenceFollowUpStatus
) => {
  if (evidenceStatus === 'available') return false;
  return (followUpStatus || defaultFollowUpStatus(evidenceStatus)) !== 'completed';
};

export const isEvidenceTaskOverdue = (
  evidenceStatus: PropertyEvidenceStatus,
  dueDate?: string,
  followUpStatus?: EvidenceFollowUpStatus,
  now: Date = new Date()
) => {
  if (!isEvidenceTaskOpen(evidenceStatus, followUpStatus)) return false;
  const due = parseDateOnly(dueDate);
  if (!due) return false;
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return due.getTime() < today.getTime();
};

export const evidenceDaysPastDue = (dueDate?: string, now: Date = new Date()) => {
  const due = parseDateOnly(dueDate);
  if (!due) return 0;
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.max(0, Math.floor((today.getTime() - due.getTime()) / 86400000));
};

export const evidenceDueSoon = (
  evidenceStatus: PropertyEvidenceStatus,
  dueDate?: string,
  followUpStatus?: EvidenceFollowUpStatus,
  days = 7,
  now: Date = new Date()
) => {
  if (!isEvidenceTaskOpen(evidenceStatus, followUpStatus)) return false;
  const due = parseDateOnly(dueDate);
  if (!due) return false;
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const diff = Math.ceil((due.getTime() - today.getTime()) / 86400000);
  return diff >= 0 && diff <= days;
};

export const getEvidenceEscalationLevel = (
  evidenceStatus: PropertyEvidenceStatus,
  dueDate?: string,
  followUpStatus?: EvidenceFollowUpStatus,
  now: Date = new Date()
): EvidenceEscalationLevel => {
  if (!isEvidenceTaskOpen(evidenceStatus, followUpStatus)) return 'normal';
  const overdue = isEvidenceTaskOverdue(evidenceStatus, dueDate, followUpStatus, now);
  if (overdue) {
    return evidenceDaysPastDue(dueDate, now) >= EVIDENCE_ESCALATION_CONFIG.criticalAfterDays
      ? 'critical'
      : 'overdue';
  }
  if (evidenceDueSoon(evidenceStatus, dueDate, followUpStatus, EVIDENCE_ESCALATION_CONFIG.dueSoonDays, now)) {
    return 'due_soon';
  }
  return 'normal';
};
