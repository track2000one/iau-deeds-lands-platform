import { apiJson } from '../../lib/http';

export type TransactionFollowUpStatus =
  | 'new'
  | 'assigned'
  | 'in_progress'
  | 'waiting_response'
  | 'needs_follow_up'
  | 'completed'
  | 'closed';

export type TransactionFollowUpPriority = 'low' | 'normal' | 'high' | 'urgent';
export type TransactionFollowUpType = 'incoming' | 'outgoing' | 'internal';

export type TransactionFollowUpIndicator =
  | 'unassigned'
  | 'overdue'
  | 'action_required'
  | 'inactive'
  | 'due_soon'
  | 'waiting'
  | 'on_track'
  | 'completed';

export type TransactionFollowUpEvent = {
  id: string;
  transactionId: string;
  eventType: string;
  fromStatus?: string | null;
  toStatus?: string | null;
  fromAssigneeUserId?: string | null;
  fromAssigneeName?: string | null;
  toAssigneeUserId?: string | null;
  toAssigneeName?: string | null;
  actionText?: string | null;
  note?: string | null;
  createdById?: string | null;
  createdByName?: string | null;
  createdAt: string;
};

export type TransactionFollowUpRecord = {
  id: string;
  trackingNumber: string;
  transactionNumber: string;
  transactionDate: string;
  transactionType: TransactionFollowUpType;
  subject: string;
  sourceEntity?: string | null;
  priority: TransactionFollowUpPriority;
  status: TransactionFollowUpStatus;
  currentAssigneeUserId?: string | null;
  currentAssigneeName?: string | null;
  assignedAt?: string | null;
  requiredAction?: string | null;
  dueDate?: string | null;
  inactivityAlertDays: number;
  lastActionAt?: string | null;
  lastActionByUserId?: string | null;
  lastActionByName?: string | null;
  notes?: string | null;
  relatedModule?: string | null;
  relatedEntityId?: string | null;
  relatedEntityLabel?: string | null;
  completedAt?: string | null;
  closedAt?: string | null;
  createdById?: string | null;
  createdByName?: string | null;
  createdAt: string;
  updatedAt: string;
  events?: TransactionFollowUpEvent[];
  indicator: TransactionFollowUpIndicator;
  indicatorLabel: string;
  indicatorSeverity: 'success' | 'warning' | 'danger' | 'info';
  daysUntilDue?: number | null;
  daysWithoutAction: number;
};

export type TransactionFollowUpAssignee = {
  id: string;
  username: string;
  email: string;
  role: 'admin' | 'employee';
};

export type TransactionFollowUpAlert = {
  id: string;
  alertKey: string;
  transactionId: string;
  userId: string;
  kind: string;
  severity: 'info' | 'warning' | 'danger';
  title: string;
  message: string;
  isRead: boolean;
  readAt?: string | null;
  createdAt: string;
  transaction: {
    id: string;
    transactionNumber: string;
    trackingNumber: string;
    subject: string;
    status: TransactionFollowUpStatus;
    currentAssigneeName?: string | null;
    dueDate?: string | null;
  };
};

export type TransactionFollowUpDashboard = {
  total: number;
  open: number;
  waiting: number;
  overdue: number;
  completed: number;
  unassigned: number;
  needsAction: number;
};

export type TransactionFollowUpPage = {
  items: TransactionFollowUpRecord[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

export type TransactionFollowUpCreateInput = {
  transactionNumber: string;
  transactionDate: string;
  transactionType: TransactionFollowUpType;
  subject: string;
  sourceEntity?: string | null;
  priority: TransactionFollowUpPriority;
  currentAssigneeUserId?: string | null;
  requiredAction?: string | null;
  dueDate?: string | null;
  inactivityAlertDays?: number;
  notes?: string | null;
  relatedModule?: string | null;
  relatedEntityId?: string | null;
  relatedEntityLabel?: string | null;
};

export const transactionFollowUpApi = {
  list: (input: {
    page?: number;
    pageSize?: number;
    search?: string;
    status?: string;
    priority?: string;
    assigneeUserId?: string;
    mine?: boolean;
  } = {}) => {
    const query = new URLSearchParams();
    if (input.page) query.set('page', String(input.page));
    if (input.pageSize) query.set('pageSize', String(input.pageSize));
    if (input.search?.trim()) query.set('search', input.search.trim());
    if (input.status) query.set('status', input.status);
    if (input.priority) query.set('priority', input.priority);
    if (input.assigneeUserId) query.set('assigneeUserId', input.assigneeUserId);
    if (input.mine) query.set('mine', 'true');
    return apiJson<TransactionFollowUpPage>(`/api/transaction-follow-up?${query.toString()}`);
  },

  dashboard: (mine = false) =>
    apiJson<TransactionFollowUpDashboard>(
      `/api/transaction-follow-up/dashboard${mine ? '?mine=true' : ''}`,
    ),

  assignees: () =>
    apiJson<TransactionFollowUpAssignee[]>('/api/transaction-follow-up/assignees'),

  alerts: () =>
    apiJson<TransactionFollowUpAlert[]>('/api/transaction-follow-up/alerts'),

  readAlert: (id: string) =>
    apiJson<TransactionFollowUpAlert>(`/api/transaction-follow-up/alerts/${id}/read`, {
      method: 'PATCH',
    }),

  readAllAlerts: () =>
    apiJson<{ updated: number }>('/api/transaction-follow-up/alerts/read-all', {
      method: 'PATCH',
    }),

  get: (id: string) =>
    apiJson<TransactionFollowUpRecord>(`/api/transaction-follow-up/${id}`),

  create: (input: TransactionFollowUpCreateInput) =>
    apiJson<TransactionFollowUpRecord>('/api/transaction-follow-up', {
      method: 'POST',
      body: JSON.stringify(input),
    }),

  update: (id: string, input: Partial<TransactionFollowUpCreateInput>) =>
    apiJson<TransactionFollowUpRecord>(`/api/transaction-follow-up/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(input),
    }),

  assign: (id: string, input: { assigneeUserId: string; note?: string | null }) =>
    apiJson<TransactionFollowUpRecord>(`/api/transaction-follow-up/${id}/assign`, {
      method: 'PATCH',
      body: JSON.stringify(input),
    }),

  recordAction: (
    id: string,
    input: {
      actionText: string;
      note?: string | null;
      status?: TransactionFollowUpStatus;
      requiredAction?: string | null;
      dueDate?: string | null;
    },
  ) =>
    apiJson<TransactionFollowUpRecord>(`/api/transaction-follow-up/${id}/action`, {
      method: 'PATCH',
      body: JSON.stringify(input),
    }),

  remove: (id: string) =>
    apiJson<void>(`/api/transaction-follow-up/${id}`, { method: 'DELETE' }),
};
