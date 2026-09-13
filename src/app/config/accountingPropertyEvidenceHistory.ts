import type { PropertyEvidenceStatus } from './accountingPropertyEvidenceRequirements';
import {
  EVIDENCE_ESCALATION_CONFIG,
  EVIDENCE_ESCALATION_LABELS,
  EVIDENCE_FOLLOW_UP_STATUS_LABELS,
  EVIDENCE_PRIORITY_LABELS,
  type EvidenceFollowUpPriority,
  type EvidenceFollowUpStatus,
} from './accountingPropertyEvidenceFollowUp';

export type EvidenceHistoryEventType =
  | 'created'
  | 'status_changed'
  | 'responsible_changed'
  | 'due_date_changed'
  | 'priority_changed'
  | 'follow_up_status_changed'
  | 'action_logged'
  | 'attachment_uploaded'
  | 'closed'
  | 'note';

export type EvidenceAuditActor = {
  userId?: string;
  username: string;
  email?: string;
  role?: string;
  roleLabel?: string;
  contextLabel?: string;
};

export type EvidenceHistoryEvent = {
  id: string;
  type: EvidenceHistoryEventType;
  at: string;
  actor?: string;
  actorUserId?: string;
  actorEmail?: string;
  actorRole?: string;
  actorRoleLabel?: string;
  actorContext?: string;
  source?: 'user' | 'system';
  serverRecordedAt?: string;
  summary: string;
  from?: string;
  to?: string;
};

export type EvidenceHistoryCompatibleEntry = {
  status?: PropertyEvidenceStatus;
  attachmentKey?: string;
  responsibleParty?: string;
  dueDate?: string;
  priority?: EvidenceFollowUpPriority;
  followUpStatus?: EvidenceFollowUpStatus;
  lastAction?: string;
  lastActionAt?: string;
  history?: EvidenceHistoryEvent[];
};

const eventId = () => `ev-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
const labelOrDash = (value?: string) => value?.trim() || 'غير محدد';

const actorFields = (actor?: EvidenceAuditActor | string, source?: 'user' | 'system') => {
  if (typeof actor === 'string') {
    return {
      actor,
      source: source || (actor === 'النظام' ? 'system' as const : 'user' as const),
    };
  }
  if (actor) {
    return {
      actor: actor.username || actor.email || 'مستخدم المنصة',
      actorUserId: actor.userId,
      actorEmail: actor.email,
      actorRole: actor.role,
      actorRoleLabel: actor.roleLabel,
      actorContext: actor.contextLabel,
      source: source || 'user' as const,
    };
  }
  return { actor: 'مستخدم المنصة', source: source || 'user' as const };
};

export const createEvidenceHistoryEvent = (
  type: EvidenceHistoryEventType,
  summary: string,
  options: {
    at?: string;
    actor?: EvidenceAuditActor | string;
    from?: string;
    to?: string;
    source?: 'user' | 'system';
  } = {}
): EvidenceHistoryEvent => ({
  id: eventId(),
  type,
  at: options.at || new Date().toISOString(),
  ...actorFields(options.actor, options.source),
  summary,
  from: options.from,
  to: options.to,
});

const statusLabel = (value?: PropertyEvidenceStatus) => value === 'available'
  ? 'متوفر'
  : value === 'needs_update'
    ? 'يحتاج تحديث'
    : 'ناقص';

/**
 * Appends audit events for changed fields. Once an entry already has history,
 * callers cannot replace or remove that history through `next.history`.
 */
export const appendEvidenceHistoryFromChanges = <T extends EvidenceHistoryCompatibleEntry>(
  previous: T | undefined,
  next: T,
  at: string = new Date().toISOString(),
  actor?: EvidenceAuditActor | string
): T => {
  const previousHistory = [...(previous?.history || [])];
  const previousIds = new Set(previousHistory.map((event) => event.id));
  const pendingEvents = previous
    ? (next.history || []).filter((event) => !previousIds.has(event.id))
    : [...(next.history || [])];
  const history = [...previousHistory, ...pendingEvents];
  const add = (event: EvidenceHistoryEvent) => history.push(event);

  if (!previous) {
    add(createEvidenceHistoryEvent('created', 'تم إنشاء مهمة متابعة لمستند الإثبات.', { at, actor }));
  }

  if (previous?.status !== undefined && previous.status !== next.status) {
    add(createEvidenceHistoryEvent('status_changed', `تم تغيير حالة المستند من «${statusLabel(previous.status)}» إلى «${statusLabel(next.status)}».`, {
      at,
      actor,
      from: statusLabel(previous.status),
      to: statusLabel(next.status),
    }));
  }
  if ((previous?.responsibleParty || '') !== (next.responsibleParty || '')) {
    add(createEvidenceHistoryEvent('responsible_changed', `تم تغيير المسؤول من «${labelOrDash(previous?.responsibleParty)}» إلى «${labelOrDash(next.responsibleParty)}».`, {
      at,
      actor,
      from: previous?.responsibleParty,
      to: next.responsibleParty,
    }));
  }
  if ((previous?.dueDate || '') !== (next.dueDate || '')) {
    add(createEvidenceHistoryEvent('due_date_changed', `تم تغيير تاريخ الاستحقاق من «${labelOrDash(previous?.dueDate)}» إلى «${labelOrDash(next.dueDate)}».`, {
      at,
      actor,
      from: previous?.dueDate,
      to: next.dueDate,
    }));
  }
  if ((previous?.priority || 'medium') !== (next.priority || 'medium')) {
    const from = EVIDENCE_PRIORITY_LABELS[previous?.priority || 'medium'];
    const to = EVIDENCE_PRIORITY_LABELS[next.priority || 'medium'];
    add(createEvidenceHistoryEvent('priority_changed', `تم تغيير الأولوية من «${from}» إلى «${to}».`, { at, actor, from, to }));
  }
  if ((previous?.followUpStatus || 'not_started') !== (next.followUpStatus || 'not_started')) {
    const from = EVIDENCE_FOLLOW_UP_STATUS_LABELS[previous?.followUpStatus || 'not_started'];
    const to = EVIDENCE_FOLLOW_UP_STATUS_LABELS[next.followUpStatus || 'not_started'];
    add(createEvidenceHistoryEvent('follow_up_status_changed', `تم تغيير حالة المتابعة من «${from}» إلى «${to}».`, { at, actor, from, to }));
  }
  if ((previous?.lastAction || '') !== (next.lastAction || '') && next.lastAction?.trim()) {
    add(createEvidenceHistoryEvent('action_logged', `إجراء متابعة: ${next.lastAction.trim()}`, {
      at: next.lastActionAt ? `${next.lastActionAt}T12:00:00` : at,
      actor,
    }));
  }
  if ((previous?.attachmentKey || '') !== (next.attachmentKey || '') && next.attachmentKey) {
    add(createEvidenceHistoryEvent('attachment_uploaded', 'تم رفع/ربط مستند إثبات بالمهمة.', { at, actor }));
  }
  const wasClosed = previous?.status === 'available' || previous?.followUpStatus === 'completed';
  const isClosed = next.status === 'available' || next.followUpStatus === 'completed';
  if (!wasClosed && isClosed) {
    add(createEvidenceHistoryEvent('closed', 'تم إقفال مهمة المتابعة بعد استكمال المستند أو اعتماد حالة الاكتمال.', { at, actor }));
  }

  return { ...next, history };
};

/** Adds a new event without exposing a replace/delete path for existing events. */
export const appendEvidenceHistoryEvent = <T extends EvidenceHistoryCompatibleEntry>(
  entry: T,
  event: EvidenceHistoryEvent
): T => ({
  ...entry,
  history: [...(entry.history || []), event],
});

export const getEvidenceDerivedMilestones = (
  entry: EvidenceHistoryCompatibleEntry,
  now: Date = new Date()
): EvidenceHistoryEvent[] => {
  if (!entry.dueDate) return [];
  const due = new Date(`${entry.dueDate}T00:00:00`);
  if (Number.isNaN(due.getTime())) return [];
  const closedEvent = [...(entry.history || [])]
    .filter((event) => event.type === 'closed')
    .sort((a, b) => Date.parse(a.at) - Date.parse(b.at))[0];
  const effectiveEnd = closedEvent ? new Date(closedEvent.at) : now;
  const events: EvidenceHistoryEvent[] = [];

  const dueSoonAt = new Date(due);
  dueSoonAt.setDate(dueSoonAt.getDate() - EVIDENCE_ESCALATION_CONFIG.dueSoonDays);
  if (dueSoonAt <= effectiveEnd) {
    events.push({ ...createEvidenceHistoryEvent('note', `دخلت المهمة نطاق الاستحقاق القريب (خلال ${EVIDENCE_ESCALATION_CONFIG.dueSoonDays} أيام).`, {
      at: dueSoonAt.toISOString(),
      actor: 'النظام',
      source: 'system',
    }), id: `system-due-soon-${entry.dueDate}` });
  }

  const overdueAt = new Date(due);
  overdueAt.setDate(overdueAt.getDate() + 1);
  if (overdueAt <= effectiveEnd) {
    events.push({ ...createEvidenceHistoryEvent('note', 'انتقلت المهمة إلى حالة متأخرة بعد تجاوز تاريخ الاستحقاق.', {
      at: overdueAt.toISOString(),
      actor: 'النظام',
      source: 'system',
    }), id: `system-overdue-${entry.dueDate}` });
  }

  const criticalAt = new Date(due);
  criticalAt.setDate(criticalAt.getDate() + EVIDENCE_ESCALATION_CONFIG.criticalAfterDays);
  if (criticalAt <= effectiveEnd) {
    events.push({ ...createEvidenceHistoryEvent('note', `انتقلت المهمة إلى مستوى التصعيد «${EVIDENCE_ESCALATION_LABELS.critical}».`, {
      at: criticalAt.toISOString(),
      actor: 'النظام',
      source: 'system',
    }), id: `system-critical-${entry.dueDate}` });
  }
  return events;
};

export const mergeEvidenceHistory = (entry: EvidenceHistoryCompatibleEntry) =>
  [...(entry.history || []), ...getEvidenceDerivedMilestones(entry)]
    .sort((a, b) => Date.parse(b.at) - Date.parse(a.at));
