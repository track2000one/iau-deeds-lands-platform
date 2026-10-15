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

export type TransactionFollowUpDirective = {
  id: string;
  transactionId: string;
  directiveType: 'directive' | 'decision';
  title: string;
  instruction: string;
  priority: 'normal' | 'high' | 'urgent';
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  assigneeUserId: string;
  assigneeName: string;
  dueDate?: string | null;
  issuedById?: string | null;
  issuedByName?: string | null;
  issuedAt: string;
  startedAt?: string | null;
  completedAt?: string | null;
  completionResponse?: string | null;
  completionNote?: string | null;
  lastUpdatedById?: string | null;
  lastUpdatedByName?: string | null;
  createdAt: string;
  updatedAt: string;
  isOverdue: boolean;
  isDueToday: boolean;
  daysOverdue: number;
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
  directives?: TransactionFollowUpDirective[];
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

export type TransactionFollowUpExecutiveInbox = {
  generatedAt: string;
  scope: 'mine' | 'all';
  counters: {
    totalOpen: number;
    attention: number;
    overdue: number;
    dueToday: number;
    unassigned: number;
    inactive: number;
    needsFollowUp: number;
    urgent: number;
    staleWaiting: number;
  };
  attentionItems: Array<{
    id: string;
    trackingNumber: string;
    transactionNumber: string;
    transactionDate: string;
    subject: string;
    priority: TransactionFollowUpPriority;
    status: TransactionFollowUpStatus;
    currentAssigneeUserId?: string | null;
    currentAssigneeName?: string | null;
    dueDate?: string | null;
    requiredAction?: string | null;
    lastActionAt?: string | null;
    daysWithoutAction: number;
    daysOverdue: number;
    reasons: string[];
    primaryReason: string;
    score: number;
  }>;
  employeeLoad: Array<{
    userId: string;
    username: string;
    open: number;
    overdue: number;
    needsAction: number;
    urgent: number;
    highLoad: boolean;
    riskScore: number;
  }>;
  highLoadThreshold: number;
};

export type TransactionFollowUpAnalytics = {
  periodDays: number | null;
  generatedAt: string;
  summary: {
    tracked: number;
    open: number;
    completed: number;
    overdueOpen: number;
    needsAction: number;
    onTimeRate: number | null;
    avgCompletionDays: number | null;
    avgFirstActionHours: number | null;
  };
  ageBuckets: {
    upTo2Days: number;
    from3To7Days: number;
    from8To14Days: number;
    over14Days: number;
  };
  employees: Array<{
    userId: string;
    username: string;
    open: number;
    overdue: number;
    completed: number;
    onTimeRate: number | null;
    avgCompletionDays: number | null;
    avgFirstActionHours: number | null;
  }>;
  oldestOverdue: Array<{
    id: string;
    trackingNumber: string;
    transactionNumber: string;
    subject: string;
    assigneeName?: string | null;
    dueDate: string;
    overdueDays: number;
    priority: TransactionFollowUpPriority;
  }>;
};

export type TransactionFollowUpPage = {
  items: TransactionFollowUpRecord[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

export type TransactionFollowUpExecutiveReport = {
  generatedAt: string;
  period: {
    from: string;
    to: string;
  };
  scope: {
    mine: boolean;
    assigneeUserId?: string | null;
  };
  summary: {
    totalIncluded: number;
    open: number;
    completed: number;
    waiting: number;
    needsFollowUp: number;
    overdueSnapshot: number;
    onTimeRate: number | null;
    avgCompletionDays: number | null;
    avgFirstActionHours: number | null;
  };
  statusCounts: Record<TransactionFollowUpStatus, number>;
  employees: Array<{
    userId?: string | null;
    username: string;
    total: number;
    open: number;
    completed: number;
    overdue: number;
  }>;
  transactions: Array<{
    id: string;
    trackingNumber: string;
    transactionNumber: string;
    transactionDate: string;
    transactionType: TransactionFollowUpType;
    subject: string;
    sourceEntity?: string | null;
    priority: TransactionFollowUpPriority;
    status: TransactionFollowUpStatus;
    currentAssigneeName?: string | null;
    requiredAction?: string | null;
    dueDate?: string | null;
    completedAt?: string | null;
    closedAt?: string | null;
    indicator: TransactionFollowUpIndicator;
    indicatorLabel: string;
  }>;
  overdueSnapshot: Array<{
    id: string;
    trackingNumber: string;
    transactionNumber: string;
    subject: string;
    priority: TransactionFollowUpPriority;
    status: TransactionFollowUpStatus;
    currentAssigneeName?: string | null;
    dueDate: string;
    overdueDays: number;
    indicatorLabel: string;
  }>;
};

export type TransactionFollowUpReportArchive = {
  id: string;
  reportType: 'weekly' | 'monthly' | 'custom';
  periodFrom: string;
  periodTo: string;
  assigneeUserId?: string | null;
  assigneeName?: string | null;
  scopeMine: boolean;
  source: 'manual' | 'scheduled' | string;
  snapshot?: TransactionFollowUpExecutiveReport;
  summary?: TransactionFollowUpExecutiveReport['summary'] | null;
  scheduleId?: string | null;
  generatedById?: string | null;
  generatedByName?: string | null;
  createdAt: string;
};

export type TransactionFollowUpReportArchivePage = {
  items: TransactionFollowUpReportArchive[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

export type TransactionFollowUpReportComparison = {
  left: TransactionFollowUpReportArchive & { snapshot: TransactionFollowUpExecutiveReport };
  right: TransactionFollowUpReportArchive & { snapshot: TransactionFollowUpExecutiveReport };
  delta: Record<
    'totalIncluded' | 'open' | 'completed' | 'waiting' | 'needsFollowUp' | 'overdueSnapshot' | 'onTimeRate' | 'avgCompletionDays' | 'avgFirstActionHours',
    number | null
  >;
};

export type TransactionFollowUpReportSchedule = {
  id: string;
  name: string;
  frequency: 'weekly' | 'monthly';
  dayOfWeek?: number | null;
  dayOfMonth?: number | null;
  runHour: number;
  assigneeUserId?: string | null;
  assigneeName?: string | null;
  isActive: boolean;
  lastRunAt?: string | null;
  nextRunAt?: string | null;
  createdById?: string | null;
  createdByName?: string | null;
  createdAt: string;
  updatedAt: string;
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

  executiveInbox: (mine = false) =>
    apiJson<TransactionFollowUpExecutiveInbox>(
      `/api/transaction-follow-up/executive-inbox${mine ? '?mine=true' : ''}`,
    ),

  analytics: (input: { mine?: boolean; periodDays?: number | 'all' } = {}) => {
    const query = new URLSearchParams();
    if (input.mine) query.set('mine', 'true');
    if (input.periodDays) query.set('periodDays', String(input.periodDays));
    const suffix = query.toString();
    return apiJson<TransactionFollowUpAnalytics>(
      `/api/transaction-follow-up/analytics${suffix ? `?${suffix}` : ''}`,
    );
  },

  executiveReport: (input: {
    from?: string;
    to?: string;
    assigneeUserId?: string;
    mine?: boolean;
  } = {}) => {
    const query = new URLSearchParams();
    if (input.from) query.set('from', input.from);
    if (input.to) query.set('to', input.to);
    if (input.assigneeUserId) query.set('assigneeUserId', input.assigneeUserId);
    if (input.mine) query.set('mine', 'true');
    const suffix = query.toString();
    return apiJson<TransactionFollowUpExecutiveReport>(
      `/api/transaction-follow-up/reports/executive${suffix ? `?${suffix}` : ''}`,
    );
  },

  reportArchives: (input: { page?: number; pageSize?: number; assigneeUserId?: string } = {}) => {
    const query = new URLSearchParams();
    if (input.page) query.set('page', String(input.page));
    if (input.pageSize) query.set('pageSize', String(input.pageSize));
    if (input.assigneeUserId) query.set('assigneeUserId', input.assigneeUserId);
    const suffix = query.toString();
    return apiJson<TransactionFollowUpReportArchivePage>(
      `/api/transaction-follow-up/reports/archives${suffix ? `?${suffix}` : ''}`,
    );
  },

  reportArchive: (id: string) =>
    apiJson<TransactionFollowUpReportArchive & { snapshot: TransactionFollowUpExecutiveReport }>(
      `/api/transaction-follow-up/reports/archives/${id}`,
    ),

  archiveReport: (input: {
    reportType: 'weekly' | 'monthly' | 'custom';
    from: string;
    to: string;
    assigneeUserId?: string | null;
  }) =>
    apiJson<TransactionFollowUpReportArchive>('/api/transaction-follow-up/reports/archives', {
      method: 'POST',
      body: JSON.stringify(input),
    }),

  compareReportArchives: (leftId: string, rightId: string) => {
    const query = new URLSearchParams({ leftId, rightId });
    return apiJson<TransactionFollowUpReportComparison>(
      `/api/transaction-follow-up/reports/archives/compare?${query.toString()}`,
    );
  },

  deleteReportArchive: (id: string) =>
    apiJson<void>(`/api/transaction-follow-up/reports/archives/${id}`, {
      method: 'DELETE',
    }),

  reportSchedules: () =>
    apiJson<TransactionFollowUpReportSchedule[]>('/api/transaction-follow-up/reports/schedules'),

  createReportSchedule: (input: {
    name: string;
    frequency: 'weekly' | 'monthly';
    dayOfWeek?: number | null;
    dayOfMonth?: number | null;
    runHour: number;
    assigneeUserId?: string | null;
    isActive?: boolean;
  }) =>
    apiJson<TransactionFollowUpReportSchedule>('/api/transaction-follow-up/reports/schedules', {
      method: 'POST',
      body: JSON.stringify(input),
    }),

  updateReportSchedule: (
    id: string,
    input: Partial<{
      name: string;
      frequency: 'weekly' | 'monthly';
      dayOfWeek: number | null;
      dayOfMonth: number | null;
      runHour: number;
      assigneeUserId: string | null;
      isActive: boolean;
    }>,
  ) =>
    apiJson<TransactionFollowUpReportSchedule>(
      `/api/transaction-follow-up/reports/schedules/${id}`,
      {
        method: 'PATCH',
        body: JSON.stringify(input),
      },
    ),

  runReportSchedule: (id: string) =>
    apiJson<{ scanned: number; generated: number }>(
      `/api/transaction-follow-up/reports/schedules/${id}/run`,
      { method: 'POST' },
    ),

  deleteReportSchedule: (id: string) =>
    apiJson<void>(`/api/transaction-follow-up/reports/schedules/${id}`, {
      method: 'DELETE',
    }),

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

  createDirective: (
    id: string,
    input: {
      directiveType: 'directive' | 'decision';
      title: string;
      instruction: string;
      priority: 'normal' | 'high' | 'urgent';
      assigneeUserId: string;
      dueDate?: string | null;
    },
  ) =>
    apiJson<TransactionFollowUpDirective>(`/api/transaction-follow-up/${id}/directives`, {
      method: 'POST',
      body: JSON.stringify(input),
    }),

  updateDirective: (
    transactionId: string,
    directiveId: string,
    input: {
      status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
      completionResponse?: string | null;
      completionNote?: string | null;
    },
  ) =>
    apiJson<TransactionFollowUpDirective>(
      `/api/transaction-follow-up/${transactionId}/directives/${directiveId}`,
      {
        method: 'PATCH',
        body: JSON.stringify(input),
      },
    ),

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
