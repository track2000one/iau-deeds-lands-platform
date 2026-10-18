import { apiJson, authenticatedFetch } from '../../lib/http';

export type TransactionFollowUpStatus =
  | 'new'
  | 'assigned'
  | 'in_progress'
  | 'waiting_response'
  | 'needs_follow_up'
  | 'completed'
  | 'closed';

export type TransactionFollowUpPriority = 'low' | 'normal' | 'high' | 'urgent';
export type TransactionFollowUpType =
  | 'incoming_internal'
  | 'incoming_external'
  | 'outgoing_internal'
  | 'outgoing_external'
  | 'other'
  // Legacy values kept for existing records created before the expanded classification.
  | 'incoming'
  | 'outgoing'
  | 'internal';

export type TransactionFollowUpOrganizationalUnit =
  | 'endowments_properties'
  | 'mosques_prayer_rooms';

export type TransactionFollowUpWorkQueueBucket =
  | 'overdue'
  | 'urgent_today'
  | 'extension_requests'
  | 'external_follow_up_due'
  | 'due_3_days'
  | 'awaiting_review'
  | 'waiting_external'
  | 'in_progress'
  | 'completed_today'
  | 'unassigned';

export type TransactionFollowUpWorkQueueAction =
  | 'start'
  | 'waiting_external'
  | 'resume'
  | 'needs_follow_up'
  | 'submit_completion'
  | 'approve_close'
  | 'return_to_employee'
  | 'reopen';

export type TransactionFollowUpExtensionRequestStatus =
  | 'pending'
  | 'approved'
  | 'rejected'
  | 'cancelled';

export type TransactionFollowUpExtensionRequest = {
  id: string;
  transactionId: string;
  currentDueDate: string;
  requestedDueDate: string;
  reason: string;
  status: TransactionFollowUpExtensionRequestStatus;
  requestedById: string;
  requestedByName: string;
  reviewedById?: string | null;
  reviewedByName?: string | null;
  reviewNote?: string | null;
  decisionAt?: string | null;
  cancelledAt?: string | null;
  createdAt: string;
  updatedAt: string;
  transaction?: {
    id: string;
    trackingNumber: string;
    transactionNumber: string;
    subject: string;
    priority: TransactionFollowUpPriority;
    status: TransactionFollowUpStatus;
    currentAssigneeUserId?: string | null;
    currentAssigneeName?: string | null;
    dueDate?: string | null;
  };
};

export type TransactionFollowUpExternalWaitStatus = 'active' | 'responded' | 'cancelled';

export type TransactionFollowUpExternalWait = {
  id: string;
  transactionId: string;
  externalEntity: string;
  outboundReferenceNumber?: string | null;
  sentAt: string;
  nextFollowUpDate: string;
  notes?: string | null;
  status: TransactionFollowUpExternalWaitStatus;
  followUpCount: number;
  lastFollowUpAt?: string | null;
  lastFollowUpNote?: string | null;
  responseReceivedAt?: string | null;
  responseReferenceNumber?: string | null;
  responseNote?: string | null;
  createdById?: string | null;
  createdByName?: string | null;
  closedById?: string | null;
  closedByName?: string | null;
  closedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  waitingDays?: number;
  daysUntilFollowUp?: number;
  followUpDue?: boolean;
  transaction?: {
    id: string;
    trackingNumber: string;
    transactionNumber: string;
    subject: string;
    priority: TransactionFollowUpPriority;
    status: TransactionFollowUpStatus;
    currentAssigneeUserId?: string | null;
    currentAssigneeName?: string | null;
    dueDate?: string | null;
  };
};

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

export type TransactionFollowUpDirectivesDashboard = {
  generatedAt: string;
  scope: 'all' | 'mine_or_employee';
  summary: {
    total: number;
    open: number;
    pending: number;
    inProgress: number;
    awaitingApproval: number;
    returned: number;
    overdue: number;
    dueToday: number;
    dueSoon: number;
    completed7d: number;
    issuedToday: number;
    urgentOpen: number;
    decisions: number;
    directives: number;
  };
  employees: Array<{
    userId: string;
    username: string;
    open: number;
    pending: number;
    inProgress: number;
    awaitingApproval: number;
    returned: number;
    overdue: number;
    completed: number;
    urgent: number;
  }>;
  items: Array<TransactionFollowUpDirective & {
    transaction: {
      id: string;
      transactionNumber: string;
      trackingNumber: string;
      subject: string;
      status: TransactionFollowUpStatus;
      currentAssigneeName?: string | null;
    };
  }>;
  totalItems: number;
};

export type TransactionFollowUpDirectiveReview = {
  id: string;
  directiveId: string;
  decision: 'approved' | 'return_for_completion' | 'request_modification';
  previousStatus: string;
  nextStatus: string;
  reviewNote?: string | null;
  completionResponse?: string | null;
  completionNote?: string | null;
  submittedAt?: string | null;
  evidenceSnapshot?: Array<{
    id?: string;
    title?: string;
    driveUrl?: string;
    driveFileId?: string | null;
    mimeType?: string | null;
    notes?: string | null;
    createdBy?: string | null;
    createdAt?: string;
  }> | null;
  reviewedById?: string | null;
  reviewedByName?: string | null;
  reviewedAt: string;
};

export type TransactionFollowUpApprovalHistoryPage = {
  generatedAt: string;
  periodDays: number | null;
  summary: {
    total: number;
    approved: number;
    returned: number;
    modificationRequested: number;
    uniqueDirectives: number;
    averageReviewHours: number | null;
  };
  employees: Array<{
    userId: string;
    username: string;
    reviews: number;
    approved: number;
    returned: number;
    modificationRequested: number;
    reworkCount: number;
    approvalRate: number | null;
  }>;
  reviewers: Array<{
    userId?: string | null;
    username: string;
    reviews: number;
    approved: number;
    returned: number;
    modificationRequested: number;
  }>;
  items: Array<TransactionFollowUpDirectiveReview & {
    directive: {
      id: string;
      directiveType: 'directive' | 'decision';
      title: string;
      instruction: string;
      priority: 'normal' | 'high' | 'urgent';
      status: TransactionFollowUpDirective['status'];
      assigneeUserId: string;
      assigneeName: string;
      dueDate?: string | null;
      issuedByName?: string | null;
      issuedAt: string;
      transaction: {
        id: string;
        transactionNumber: string;
        trackingNumber: string;
        transactionDate: string;
        subject: string;
        status: TransactionFollowUpStatus;
        currentAssigneeName?: string | null;
      };
    };
  }>;
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

export type TransactionFollowUpKpiTargets = {
  id?: string;
  scope: 'global' | string;
  firstPassRateMin: number;
  onTimeRateMin: number;
  reworkRateMax: number;
  avgExecutionHoursMax: number;
  avgApprovalHoursMax: number;
  warningTolerancePercent: number;
  alertPeriodDays: number;
  alertsEnabled: boolean;
  updatedById?: string | null;
  updatedByName?: string | null;
  createdAt?: string;
  updatedAt?: string;
};

export type TransactionFollowUpKpiEvaluationItem = {
  status: 'green' | 'yellow' | 'red' | 'neutral';
  met: boolean | null;
  value: number | null;
  target: number;
  direction: 'min' | 'max';
};

export type TransactionFollowUpKpiEvaluation = {
  firstPassRate: TransactionFollowUpKpiEvaluationItem;
  onTimeRate: TransactionFollowUpKpiEvaluationItem;
  reworkRate: TransactionFollowUpKpiEvaluationItem;
  avgExecutionHours: TransactionFollowUpKpiEvaluationItem;
  avgApprovalHours: TransactionFollowUpKpiEvaluationItem;
};

export type TransactionFollowUpImprovementPlanEvent = {
  id: string;
  planId: string;
  action: string;
  fromStatus?: string | null;
  toStatus?: string | null;
  note?: string | null;
  resultValue?: number | null;
  resultMetTarget?: boolean | null;
  changedById?: string | null;
  changedByName?: string | null;
  createdAt: string;
};

export type TransactionFollowUpImprovementPlan = {
  id: string;
  metricKey: 'firstPassRate' | 'onTimeRate' | 'reworkRate' | 'avgExecutionHours' | 'avgApprovalHours';
  metricLabel: string;
  scopeType: 'global' | 'employee';
  assigneeUserId?: string | null;
  assigneeName?: string | null;
  baselineValue?: number | null;
  targetValue: number;
  direction: 'min' | 'max';
  periodDays: number;
  rootCause: string;
  correctiveAction: string;
  preventiveAction?: string | null;
  ownerUserId?: string | null;
  ownerName?: string | null;
  dueDate: string;
  status: 'open' | 'in_progress' | 'monitoring' | 'completed' | 'cancelled';
  progressNote?: string | null;
  resultValue?: number | null;
  resultMetTarget?: boolean | null;
  startedAt?: string | null;
  monitoringAt?: string | null;
  completedAt?: string | null;
  cancelledAt?: string | null;
  verifiedAt?: string | null;
  verifiedById?: string | null;
  verifiedByName?: string | null;
  createdById?: string | null;
  createdByName?: string | null;
  createdAt: string;
  updatedAt: string;
  isOverdue?: boolean;
  events?: TransactionFollowUpImprovementPlanEvent[];
};

export type TransactionFollowUpPreventiveActionEvent = {
  id: string;
  actionId: string;
  action: string;
  fromStatus?: string | null;
  toStatus?: string | null;
  note?: string | null;
  resultValue?: number | null;
  resultRiskScore?: number | null;
  resultStatus?: string | null;
  resultMetTarget?: boolean | null;
  changedById?: string | null;
  changedByName?: string | null;
  createdAt: string;
};

export type TransactionFollowUpPreventiveAction = {
  id: string;
  sourceType: 'metric' | 'employee';
  metricKey?: TransactionFollowUpImprovementPlan['metricKey'] | null;
  metricLabel?: string | null;
  scopeType: 'global' | 'employee';
  assigneeUserId?: string | null;
  assigneeName?: string | null;
  ownerUserId: string;
  ownerName: string;
  actionText: string;
  expectedOutcome?: string | null;
  periodDays: number;
  baselineValue?: number | null;
  projectedValue?: number | null;
  targetValue?: number | null;
  direction?: 'min' | 'max' | null;
  sourceRiskScore?: number | null;
  sourceRiskLevel?: 'low' | 'medium' | 'high' | 'critical' | null;
  sourceReasons?: string[] | null;
  dueDate: string;
  status: 'open' | 'in_progress' | 'monitoring' | 'effective' | 'failed' | 'cancelled';
  progressNote?: string | null;
  resultValue?: number | null;
  resultRiskScore?: number | null;
  resultStatus?: string | null;
  resultMetTarget?: boolean | null;
  verifiedAt?: string | null;
  verifiedById?: string | null;
  verifiedByName?: string | null;
  completedAt?: string | null;
  failedAt?: string | null;
  cancelledAt?: string | null;
  improvementPlanId?: string | null;
  escalatedAt?: string | null;
  createdById?: string | null;
  createdByName?: string | null;
  createdAt: string;
  updatedAt: string;
  isOverdue?: boolean;
  events?: TransactionFollowUpPreventiveActionEvent[];
};

export type TransactionFollowUpPreventiveActionPage = {
  generatedAt: string;
  supervisor: boolean;
  summary: {
    open: number;
    overdue: number;
    monitoring: number;
    effective30d: number;
    failed: number;
  };
  items: TransactionFollowUpPreventiveAction[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

export type TransactionFollowUpEarlyWarningMetric = {
  metricKey: 'firstPassRate' | 'onTimeRate' | 'reworkRate' | 'avgExecutionHours' | 'avgApprovalHours';
  metricLabel: string;
  currentValue: number | null;
  previousValue: number | null;
  delta: number | null;
  projectedValue: number | null;
  target: number;
  direction: 'min' | 'max';
  currentStatus: 'green' | 'yellow' | 'red' | 'neutral';
  projectedStatus: 'green' | 'yellow' | 'red' | 'neutral';
  riskScore: number;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  confidence: 'low' | 'medium' | 'high';
  reasons: string[];
  recommendation: string;
};

export type TransactionFollowUpEarlyWarning = {
  generatedAt: string;
  methodology: 'rule_based_linear_trend' | string;
  periodDays: number;
  targets: TransactionFollowUpKpiTargets;
  summary: {
    atRiskMetrics: number;
    predictedMetricBreaches: number;
    atRiskEmployees: number;
    criticalEmployees: number;
    highRiskEmployees: number;
    mediumRiskEmployees: number;
  };
  metrics: TransactionFollowUpEarlyWarningMetric[];
  employees: Array<{
    userId: string;
    username: string;
    riskScore: number;
    riskLevel: 'low' | 'medium' | 'high' | 'critical';
    confidence: 'low' | 'medium' | 'high';
    openDirectives: number;
    overdueOpen: number;
    urgentOpen: number;
    returnedOpen: number;
    reviewedDirectives: number;
    topMetric: TransactionFollowUpEarlyWarningMetric | null;
    predictedBreaches: number;
    reasons: string[];
    recommendation: string;
  }>;
};

export type TransactionFollowUpImprovementEffectiveness = {
  generatedAt: string;
  periodDays: number | null;
  recurrenceWindowDays: number;
  summary: {
    plans: number;
    open: number;
    overdue: number;
    verified: number;
    successful: number;
    unsuccessful: number;
    effectivenessRate: number | null;
    avgRecoveryDays: number | null;
    avgImprovementPercent: number | null;
    recurrenceEligible: number;
    recurrenceCount: number;
    recurrenceRate90d: number | null;
    sustainedSuccessRate90d: number | null;
  };
  metricBreakdown: Array<{
    metricKey: TransactionFollowUpImprovementPlan['metricKey'];
    metricLabel: string;
    plans: number;
    verified: number;
    successful: number;
    effectivenessRate: number | null;
    avgRecoveryDays: number | null;
    recurrenceRate90d: number | null;
  }>;
  topRootCauses: Array<{
    text: string;
    plans: number;
    verified: number;
    successful: number;
    open: number;
    effectivenessRate: number | null;
    avgRecoveryDays: number | null;
  }>;
  topCorrectiveActions: Array<{
    text: string;
    plans: number;
    verified: number;
    successful: number;
    open: number;
    effectivenessRate: number | null;
    avgRecoveryDays: number | null;
  }>;
  owners: Array<{
    userId?: string | null;
    username: string;
    plans: number;
    open: number;
    overdue: number;
    verified: number;
    successful: number;
    effectivenessRate: number | null;
    avgRecoveryDays: number | null;
  }>;
  monthlyTrend: Array<{
    key: string;
    year: number;
    month: number;
    created: number;
    verified: number;
    successful: number;
  }>;
};

export type TransactionFollowUpImprovementPlanPage = {
  generatedAt: string;
  summary: {
    open: number;
    overdue: number;
    monitoring: number;
    completed30d: number;
  };
  items: TransactionFollowUpImprovementPlan[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

export type TransactionFollowUpDirectiveKpiMetrics = {
  reviewCount: number;
  reviewedDirectives: number;
  approvedDirectives: number;
  approvedReviews: number;
  returnedReviews: number;
  modificationReviews: number;
  firstPassRate: number | null;
  reworkRate: number | null;
  avgExecutionHours: number | null;
  avgApprovalHours: number | null;
  onTimeRate: number | null;
};

export type TransactionFollowUpDirectiveKpi = {
  generatedAt: string;
  periodDays: number | null;
  assigneeUserId?: string | null;
  targets: TransactionFollowUpKpiTargets;
  evaluation: TransactionFollowUpKpiEvaluation;
  summary: TransactionFollowUpDirectiveKpiMetrics & {
    openDirectives: number;
    overdueOpen: number;
    urgentOpen: number;
  };
  previousSummary: (TransactionFollowUpDirectiveKpiMetrics & {
    openDirectives: number | null;
    overdueOpen: number | null;
    urgentOpen: number | null;
  }) | null;
  employees: Array<TransactionFollowUpDirectiveKpiMetrics & {
    userId: string;
    username: string;
    openDirectives: number;
    overdueOpen: number;
    urgentOpen: number;
    evaluation: TransactionFollowUpKpiEvaluation;
  }>;
  monthlyTrend: Array<TransactionFollowUpDirectiveKpiMetrics & {
    key: string;
    year: number;
    month: number;
  }>;
};

export type TransactionFollowUpAttachment = {
  id: string;
  entityType: 'transaction_follow_up';
  entityId: string;
  attachmentType: string;
  title: string;
  driveUrl: string;
  driveFileId?: string | null;
  mimeType?: string | null;
  notes?: string | null;
  createdBy?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type TransactionFollowUpDirectiveEvidence = {
  id: string;
  entityType: 'transaction_follow_up_directive';
  entityId: string;
  attachmentType: string;
  title: string;
  driveUrl: string;
  driveFileId?: string | null;
  mimeType?: string | null;
  notes?: string | null;
  createdBy?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type TransactionFollowUpBackupAttachment = {
  id: string;
  entityType: 'transaction_follow_up' | 'transaction_follow_up_directive';
  entityId: string;
  attachmentType: string;
  title: string;
  driveUrl: string;
  driveFileId?: string | null;
  mimeType?: string | null;
  notes?: string | null;
  createdBy?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type TransactionFollowUpDirective = {
  id: string;
  transactionId: string;
  directiveType: 'directive' | 'decision';
  title: string;
  instruction: string;
  priority: 'normal' | 'high' | 'urgent';
  status: 'pending' | 'in_progress' | 'awaiting_approval' | 'returned' | 'completed' | 'cancelled';
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
  completionSubmittedAt?: string | null;
  completionSubmittedById?: string | null;
  completionSubmittedByName?: string | null;
  reviewDecision?: 'approved' | 'return_for_completion' | 'request_modification' | null;
  reviewNote?: string | null;
  reviewedAt?: string | null;
  reviewedById?: string | null;
  reviewedByName?: string | null;
  lastUpdatedById?: string | null;
  lastUpdatedByName?: string | null;
  createdAt: string;
  updatedAt: string;
  isOverdue: boolean;
  isDueToday: boolean;
  daysOverdue: number;
  evidence?: TransactionFollowUpDirectiveEvidence[];
  evidenceCount?: number;
  reviews?: TransactionFollowUpDirectiveReview[];
};

export type TransactionFollowUpApprovalCenter = {
  generatedAt: string;
  summary: {
    awaitingApproval: number;
    urgent: number;
    overdue: number;
    withoutEvidence: number;
    waitingOver2Days: number;
  };
  employees: Array<{
    userId: string;
    username: string;
    awaitingApproval: number;
    urgent: number;
    withoutEvidence: number;
    maxWaitingDays: number;
  }>;
  items: Array<TransactionFollowUpDirective & {
    waitingDays: number;
    evidence: TransactionFollowUpDirectiveEvidence[];
    transaction: {
      id: string;
      transactionNumber: string;
      trackingNumber: string;
      transactionDate: string;
      subject: string;
      priority: TransactionFollowUpPriority;
      status: TransactionFollowUpStatus;
      currentAssigneeName?: string | null;
    };
  }>;
  totalItems: number;
};

export type TransactionFollowUpRecord = {
  id: string;
  trackingNumber: string;
  transactionNumber: string;
  transactionDate: string;
  transactionDateType?: 'gregorian' | 'hijri';
  transactionDateInput?: string | null;
  transactionYear?: number | null;
  transactionType: TransactionFollowUpType;
  organizationalUnit?: TransactionFollowUpOrganizationalUnit | null;
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
  archivedAt?: string | null;
  archivedById?: string | null;
  archivedByName?: string | null;
  archiveNote?: string | null;
  createdById?: string | null;
  createdByName?: string | null;
  createdAt: string;
  updatedAt: string;
  events?: TransactionFollowUpEvent[];
  directives?: TransactionFollowUpDirective[];
  extensionRequests?: TransactionFollowUpExtensionRequest[];
  externalWaits?: TransactionFollowUpExternalWait[];
  attachments?: TransactionFollowUpAttachment[];
  indicator: TransactionFollowUpIndicator;
  indicatorLabel: string;
  indicatorSeverity: 'success' | 'warning' | 'danger' | 'info';
  daysUntilDue?: number | null;
  daysWithoutAction: number;
};

export type TransactionFollowUpWorkQueueItem = TransactionFollowUpRecord & {
  pendingExtension?: TransactionFollowUpExtensionRequest | null;
  activeExternalWait?: TransactionFollowUpExternalWait | null;
  queueBucket: TransactionFollowUpWorkQueueBucket;
  daysUntilDue?: number | null;
  overdueDays: number;
  ageDays: number;
  quickActions: TransactionFollowUpWorkQueueAction[];
};

export type TransactionFollowUpWorkQueue = {
  generatedAt: string;
  scope: 'mine' | 'all';
  supervisor: boolean;
  canReopen?: boolean;
  focusBucket: TransactionFollowUpWorkQueueBucket;
  counts: Record<TransactionFollowUpWorkQueueBucket, number>;
  buckets: Record<TransactionFollowUpWorkQueueBucket, TransactionFollowUpWorkQueueItem[]>;
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
  transactionId?: string | null;
  userId: string;
  kind: string;
  severity: 'info' | 'warning' | 'danger';
  title: string;
  message: string;
  isRead: boolean;
  readAt?: string | null;
  createdAt: string;
  transaction?: {
    id: string;
    transactionNumber: string;
    trackingNumber: string;
    subject: string;
    status: TransactionFollowUpStatus;
    currentAssigneeName?: string | null;
    dueDate?: string | null;
  } | null;
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

export type TransactionFollowUpBackupData = {
  generatedAt: string;
  full: boolean;
  period?: { from: string; to: string } | null;
  scope: {
    mine: boolean;
    assigneeUserId?: string | null;
  };
  transactions: Array<{
    id: string;
    trackingNumber: string;
    transactionNumber: string;
    transactionDate: string;
    transactionDateType?: 'gregorian' | 'hijri';
    transactionDateInput?: string | null;
    transactionYear?: number | null;
    transactionType: TransactionFollowUpType;
    organizationalUnit?: TransactionFollowUpOrganizationalUnit | null;
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
    archivedAt?: string | null;
    archivedById?: string | null;
    archivedByName?: string | null;
    archiveNote?: string | null;
    createdById?: string | null;
    createdByName?: string | null;
    createdAt: string;
    updatedAt: string;
    events: TransactionFollowUpEvent[];
    directives: Array<{
      id: string;
      transactionId: string;
      directiveType: 'directive' | 'decision';
      title: string;
      instruction: string;
      priority: 'normal' | 'high' | 'urgent';
      status: string;
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
      completionSubmittedAt?: string | null;
      completionSubmittedById?: string | null;
      completionSubmittedByName?: string | null;
      reviewDecision?: string | null;
      reviewNote?: string | null;
      reviewedAt?: string | null;
      reviewedById?: string | null;
      reviewedByName?: string | null;
      lastUpdatedById?: string | null;
      lastUpdatedByName?: string | null;
      createdAt: string;
      updatedAt: string;
      reviews: TransactionFollowUpDirectiveReview[];
    }>;
    extensionRequests: TransactionFollowUpExtensionRequest[];
    externalWaits: TransactionFollowUpExternalWait[];
  }>;
  attachments: TransactionFollowUpBackupAttachment[];
  totals: {
    transactions: number;
    events: number;
    directives: number;
    attachments: number;
  };
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

export type TransactionFollowUpBackupSchedule = {
  id: string;
  scope: string;
  frequency: 'weekly' | 'monthly';
  dayOfWeek?: number | null;
  dayOfMonth?: number | null;
  runHour: number;
  includeAttachments: boolean;
  retentionCount: number;
  isActive: boolean;
  lastRunAt?: string | null;
  nextRunAt?: string | null;
  updatedById?: string | null;
  updatedByName?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type TransactionFollowUpBackupRun = {
  id: string;
  scheduleId?: string | null;
  status: 'running' | 'success' | 'partial' | 'failed';
  folderId?: string | null;
  folderUrl?: string | null;
  folderName?: string | null;
  workbookFileId?: string | null;
  workbookUrl?: string | null;
  manifestFileId?: string | null;
  manifestUrl?: string | null;
  transactionCount: number;
  attachmentCount: number;
  copiedAttachmentCount: number;
  failedAttachmentCount: number;
  errorMessage?: string | null;
  integrityStatus?: 'success' | 'warning' | 'failed' | null;
  integrityMessage?: string | null;
  verifiedFileCount?: number | null;
  verifiedAt?: string | null;
  restoreTestStatus?: 'success' | 'warning' | 'failed' | null;
  restoreTestMessage?: string | null;
  restoreTestTransactions?: number | null;
  restoreTestRelations?: number | null;
  restoreTestAttachments?: number | null;
  restoreTestAt?: string | null;
  startedAt: string;
  completedAt?: string | null;
  createdAt: string;
};

export type TransactionFollowUpBackupSettings = {
  schedule: TransactionFollowUpBackupSchedule;
  runs: TransactionFollowUpBackupRun[];
};

export type TransactionFollowUpCreateInput = {
  transactionNumber: string;
  transactionDate: string;
  transactionDateType: 'gregorian' | 'hijri';
  transactionType: TransactionFollowUpType;
  organizationalUnit: TransactionFollowUpOrganizationalUnit;
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

  archived: (input: { page?: number; pageSize?: number; search?: string } = {}) => {
    const query = new URLSearchParams();
    if (input.page) query.set('page', String(input.page));
    if (input.pageSize) query.set('pageSize', String(input.pageSize));
    if (input.search?.trim()) query.set('search', input.search.trim());
    const suffix = query.toString();
    return apiJson<TransactionFollowUpPage>(
      `/api/archive/transactions${suffix ? `?${suffix}` : ''}`,
    );
  },

  archivedRecord: (id: string) =>
    apiJson<TransactionFollowUpRecord>(`/api/archive/transactions/${id}`),

  archive: (id: string, note?: string | null) =>
    apiJson<TransactionFollowUpRecord>(`/api/archive/transactions/${id}`, {
      method: 'POST',
      body: JSON.stringify({ note: note || null }),
    }),

  restoreFromArchive: (id: string, note?: string | null) =>
    apiJson<TransactionFollowUpRecord>(`/api/archive/transactions/${id}/restore`, {
      method: 'PATCH',
      body: JSON.stringify({ note: note || null }),
    }),

  deleteArchivedTransaction: (id: string) =>
    apiJson<void>(`/api/archive/transactions/${id}`, {
      method: 'DELETE',
    }),

  dashboard: (mine = false) =>
    apiJson<TransactionFollowUpDashboard>(
      `/api/transaction-follow-up/dashboard${mine ? '?mine=true' : ''}`,
    ),

  workQueue: (mine = false) =>
    apiJson<TransactionFollowUpWorkQueue>(
      `/api/transaction-follow-up/work-queue${mine ? '?mine=true' : ''}`,
    ),

  workQueueAction: (
    id: string,
    input: {
      action: TransactionFollowUpWorkQueueAction;
      note?: string | null;
    },
  ) =>
    apiJson<TransactionFollowUpRecord>(
      `/api/transaction-follow-up/${id}/work-queue-action`,
      {
        method: 'PATCH',
        body: JSON.stringify(input),
      },
    ),

  extensionRequests: (status: TransactionFollowUpExtensionRequestStatus = 'pending') =>
    apiJson<TransactionFollowUpExtensionRequest[]>(
      `/api/transaction-follow-up/extension-requests?status=${encodeURIComponent(status)}`,
    ),

  requestExtension: (
    transactionId: string,
    input: { requestedDueDate: string; reason: string },
  ) =>
    apiJson<TransactionFollowUpExtensionRequest>(
      `/api/transaction-follow-up/${transactionId}/extension-requests`,
      {
        method: 'POST',
        body: JSON.stringify(input),
      },
    ),

  decideExtensionRequest: (
    requestId: string,
    input: { decision: 'approved' | 'rejected'; reviewNote?: string | null },
  ) =>
    apiJson<TransactionFollowUpExtensionRequest>(
      `/api/transaction-follow-up/extension-requests/${requestId}/decision`,
      {
        method: 'PATCH',
        body: JSON.stringify(input),
      },
    ),

  cancelExtensionRequest: (requestId: string) =>
    apiJson<TransactionFollowUpExtensionRequest>(
      `/api/transaction-follow-up/extension-requests/${requestId}/cancel`,
      {
        method: 'PATCH',
        body: JSON.stringify({}),
      },
    ),

  externalWaits: (status: TransactionFollowUpExternalWaitStatus = 'active') =>
    apiJson<TransactionFollowUpExternalWait[]>(
      `/api/transaction-follow-up/external-waits?status=${encodeURIComponent(status)}`,
    ),

  startExternalWait: (
    transactionId: string,
    input: {
      externalEntity: string;
      outboundReferenceNumber?: string | null;
      sentAt: string;
      nextFollowUpDate: string;
      notes?: string | null;
    },
  ) =>
    apiJson<TransactionFollowUpExternalWait>(
      `/api/transaction-follow-up/${transactionId}/external-wait`,
      {
        method: 'POST',
        body: JSON.stringify(input),
      },
    ),

  recordExternalFollowUp: (
    waitId: string,
    input: { nextFollowUpDate: string; note: string },
  ) =>
    apiJson<TransactionFollowUpExternalWait>(
      `/api/transaction-follow-up/external-waits/${waitId}/follow-up`,
      {
        method: 'PATCH',
        body: JSON.stringify(input),
      },
    ),

  recordExternalResponse: (
    waitId: string,
    input: {
      responseReceivedAt: string;
      responseReferenceNumber?: string | null;
      responseNote: string;
    },
  ) =>
    apiJson<TransactionFollowUpExternalWait>(
      `/api/transaction-follow-up/external-waits/${waitId}/response`,
      {
        method: 'PATCH',
        body: JSON.stringify(input),
      },
    ),

  cancelExternalWait: (waitId: string, note: string) =>
    apiJson<TransactionFollowUpExternalWait>(
      `/api/transaction-follow-up/external-waits/${waitId}/cancel`,
      {
        method: 'PATCH',
        body: JSON.stringify({ note }),
      },
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

  backupData: (input: {
    full?: boolean;
    from?: string;
    to?: string;
    assigneeUserId?: string;
    mine?: boolean;
  } = {}) => {
    const query = new URLSearchParams();
    if (input.full) query.set('full', 'true');
    if (input.from) query.set('from', input.from);
    if (input.to) query.set('to', input.to);
    if (input.assigneeUserId) query.set('assigneeUserId', input.assigneeUserId);
    if (input.mine) query.set('mine', 'true');
    const suffix = query.toString();
    return apiJson<TransactionFollowUpBackupData>(
      `/api/transaction-follow-up/reports/backup-data${suffix ? `?${suffix}` : ''}`,
    );
  },

  downloadBackupAttachment: async (attachmentId: string) => {
    const response = await authenticatedFetch(
      `/api/transaction-follow-up/reports/backup-attachments/${attachmentId}`,
    );
    if (!response.ok) {
      const payload = await response.json().catch(() => ({}));
      throw new Error(payload?.message || 'تعذر تنزيل المرفق');
    }
    return response.blob();
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

  backupSettings: () =>
    apiJson<TransactionFollowUpBackupSettings>('/api/transaction-follow-up/reports/backup-schedule'),

  updateBackupSchedule: (input: {
    frequency: 'weekly' | 'monthly';
    dayOfWeek?: number | null;
    dayOfMonth?: number | null;
    runHour: number;
    includeAttachments: boolean;
    retentionCount: number;
    isActive: boolean;
  }) =>
    apiJson<TransactionFollowUpBackupSchedule>('/api/transaction-follow-up/reports/backup-schedule', {
      method: 'PUT',
      body: JSON.stringify(input),
    }),

  runBackupNow: () =>
    apiJson<{
      run: TransactionFollowUpBackupRun;
      failedAttachments?: Array<{ attachmentId: string; title: string; reason: string }>;
      message: string;
    }>('/api/transaction-follow-up/reports/backup-schedule/run', {
      method: 'POST',
    }),

  verifyBackupRun: (id: string) =>
    apiJson<TransactionFollowUpBackupRun>(
      `/api/transaction-follow-up/reports/backup-runs/${id}/verify`,
      { method: 'POST' },
    ),

  testBackupRestore: (id: string) =>
    apiJson<TransactionFollowUpBackupRun>(
      `/api/transaction-follow-up/reports/backup-runs/${id}/restore-test`,
      { method: 'POST' },
    ),

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

  uploadAttachment: async (
    transactionId: string,
    file: File,
    notes?: string | null,
  ) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('fileName', file.name);

    const uploadResponse = await authenticatedFetch('/api/uploads', {
      method: 'POST',
      headers: { 'x-upload-module': 'transaction_follow_up' },
      body: formData,
    });
    const uploaded = await uploadResponse.json().catch(() => ({}));
    if (!uploadResponse.ok) {
      throw new Error(uploaded?.message || `تعذر رفع الملف: ${file.name}`);
    }

    try {
      return await apiJson<TransactionFollowUpAttachment>(
        `/api/transaction-follow-up/${transactionId}/attachments`,
        {
          method: 'POST',
          body: JSON.stringify({
            title: file.name,
            driveUrl: uploaded.driveUrl,
            driveFileId: uploaded.driveFileId || null,
            mimeType: uploaded.mimeType || file.type || null,
            notes: notes || null,
          }),
        },
      );
    } catch (error) {
      if (uploaded.driveFileId) {
        void authenticatedFetch(`/api/uploads/${uploaded.driveFileId}`, {
          method: 'DELETE',
          headers: { 'x-upload-module': 'transaction_follow_up' },
        }).catch(() => undefined);
      }
      throw error;
    }
  },

  deleteAttachment: (
    transactionId: string,
    attachmentId: string,
  ) =>
    apiJson<void>(
      `/api/transaction-follow-up/${transactionId}/attachments/${attachmentId}`,
      { method: 'DELETE' },
    ),

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

  directivesDashboard: (input: {
    search?: string;
    status?: string;
    priority?: string;
    assigneeUserId?: string;
  } = {}) => {
    const query = new URLSearchParams();
    if (input.search) query.set('search', input.search);
    if (input.status) query.set('status', input.status);
    if (input.priority) query.set('priority', input.priority);
    if (input.assigneeUserId) query.set('assigneeUserId', input.assigneeUserId);
    const suffix = query.toString();
    return apiJson<TransactionFollowUpDirectivesDashboard>(
      `/api/transaction-follow-up/directives/dashboard${suffix ? `?${suffix}` : ''}`,
    );
  },

  earlyWarning: (input: { periodDays?: number } = {}) => {
    const query = new URLSearchParams();
    if (input.periodDays) query.set('periodDays', String(input.periodDays));
    const suffix = query.toString();
    return apiJson<TransactionFollowUpEarlyWarning>(
      `/api/transaction-follow-up/directives/early-warning${suffix ? `?${suffix}` : ''}`,
    );
  },

  preventiveActions: (input: {
    page?: number;
    pageSize?: number;
    status?: string;
    metricKey?: string;
  } = {}) => {
    const query = new URLSearchParams();
    if (input.page) query.set('page', String(input.page));
    if (input.pageSize) query.set('pageSize', String(input.pageSize));
    if (input.status) query.set('status', input.status);
    if (input.metricKey) query.set('metricKey', input.metricKey);
    const suffix = query.toString();
    return apiJson<TransactionFollowUpPreventiveActionPage>(
      `/api/transaction-follow-up/directives/preventive-actions${suffix ? `?${suffix}` : ''}`,
    );
  },

  createPreventiveAction: (input: {
    sourceType: 'metric' | 'employee';
    metricKey?: TransactionFollowUpImprovementPlan['metricKey'] | null;
    scopeType: 'global' | 'employee';
    assigneeUserId?: string | null;
    ownerUserId: string;
    actionText: string;
    expectedOutcome?: string | null;
    periodDays: number;
    baselineValue?: number | null;
    projectedValue?: number | null;
    targetValue?: number | null;
    direction?: 'min' | 'max' | null;
    sourceRiskScore?: number | null;
    sourceRiskLevel?: 'low' | 'medium' | 'high' | 'critical' | null;
    sourceReasons?: string[];
    dueDate: string;
  }) =>
    apiJson<TransactionFollowUpPreventiveAction>('/api/transaction-follow-up/directives/preventive-actions', {
      method: 'POST',
      body: JSON.stringify(input),
    }),

  updatePreventiveAction: (
    id: string,
    input: {
      status?: 'open' | 'in_progress' | 'monitoring' | 'cancelled';
      ownerUserId?: string | null;
      actionText?: string;
      expectedOutcome?: string | null;
      dueDate?: string;
      progressNote?: string | null;
    },
  ) =>
    apiJson<TransactionFollowUpPreventiveAction>(
      `/api/transaction-follow-up/directives/preventive-actions/${id}`,
      {
        method: 'PATCH',
        body: JSON.stringify(input),
      },
    ),

  verifyPreventiveAction: (id: string) =>
    apiJson<TransactionFollowUpPreventiveAction & {
      verification: {
        resultValue?: number | null;
        resultRiskScore?: number | null;
        resultStatus?: string | null;
        metTarget?: boolean;
        effective: boolean;
        capaRecommended: boolean;
      };
    }>(`/api/transaction-follow-up/directives/preventive-actions/${id}/verify`, {
      method: 'PATCH',
      body: JSON.stringify({}),
    }),

  linkPreventiveActionCapa: (id: string, improvementPlanId: string) =>
    apiJson<TransactionFollowUpPreventiveAction>(
      `/api/transaction-follow-up/directives/preventive-actions/${id}/link-capa`,
      {
        method: 'POST',
        body: JSON.stringify({ improvementPlanId }),
      },
    ),

  improvementEffectiveness: (input: { periodDays?: number | 'all' } = {}) => {
    const query = new URLSearchParams();
    if (input.periodDays) query.set('periodDays', String(input.periodDays));
    const suffix = query.toString();
    return apiJson<TransactionFollowUpImprovementEffectiveness>(
      `/api/transaction-follow-up/directives/improvement-plans/effectiveness${suffix ? `?${suffix}` : ''}`,
    );
  },

  improvementPlans: (input: {
    page?: number;
    pageSize?: number;
    status?: string;
    metricKey?: string;
    assigneeUserId?: string;
  } = {}) => {
    const query = new URLSearchParams();
    if (input.page) query.set('page', String(input.page));
    if (input.pageSize) query.set('pageSize', String(input.pageSize));
    if (input.status) query.set('status', input.status);
    if (input.metricKey) query.set('metricKey', input.metricKey);
    if (input.assigneeUserId) query.set('assigneeUserId', input.assigneeUserId);
    const suffix = query.toString();
    return apiJson<TransactionFollowUpImprovementPlanPage>(
      `/api/transaction-follow-up/directives/improvement-plans${suffix ? `?${suffix}` : ''}`,
    );
  },

  createImprovementPlan: (input: {
    metricKey: TransactionFollowUpImprovementPlan['metricKey'];
    scopeType: 'global' | 'employee';
    assigneeUserId?: string | null;
    baselineValue?: number | null;
    targetValue: number;
    direction: 'min' | 'max';
    periodDays: number;
    rootCause: string;
    correctiveAction: string;
    preventiveAction?: string | null;
    ownerUserId?: string | null;
    dueDate: string;
  }) =>
    apiJson<TransactionFollowUpImprovementPlan>('/api/transaction-follow-up/directives/improvement-plans', {
      method: 'POST',
      body: JSON.stringify(input),
    }),

  updateImprovementPlan: (
    id: string,
    input: {
      status?: TransactionFollowUpImprovementPlan['status'];
      rootCause?: string;
      correctiveAction?: string;
      preventiveAction?: string | null;
      ownerUserId?: string | null;
      dueDate?: string;
      progressNote?: string | null;
    },
  ) =>
    apiJson<TransactionFollowUpImprovementPlan>(
      `/api/transaction-follow-up/directives/improvement-plans/${id}`,
      {
        method: 'PATCH',
        body: JSON.stringify(input),
      },
    ),

  verifyImprovementPlan: (id: string) =>
    apiJson<TransactionFollowUpImprovementPlan & {
      verification: {
        value: number;
        target: number;
        direction: 'min' | 'max';
        metTarget: boolean;
        status: 'green' | 'yellow' | 'red' | 'neutral';
      };
    }>(`/api/transaction-follow-up/directives/improvement-plans/${id}/verify`, {
      method: 'PATCH',
      body: JSON.stringify({}),
    }),

  kpiTargets: () =>
    apiJson<TransactionFollowUpKpiTargets>('/api/transaction-follow-up/directives/kpi-targets'),

  saveKpiTargets: (input: Omit<TransactionFollowUpKpiTargets, 'id' | 'scope' | 'updatedById' | 'updatedByName' | 'createdAt' | 'updatedAt'>) =>
    apiJson<TransactionFollowUpKpiTargets>('/api/transaction-follow-up/directives/kpi-targets', {
      method: 'PUT',
      body: JSON.stringify(input),
    }),

  directiveKpi: (input: {
    periodDays?: number | 'all';
    assigneeUserId?: string;
  } = {}) => {
    const query = new URLSearchParams();
    if (input.periodDays) query.set('periodDays', String(input.periodDays));
    if (input.assigneeUserId) query.set('assigneeUserId', input.assigneeUserId);
    const suffix = query.toString();
    return apiJson<TransactionFollowUpDirectiveKpi>(
      `/api/transaction-follow-up/directives/kpi${suffix ? `?${suffix}` : ''}`,
    );
  },

  approvalHistory: (input: {
    page?: number;
    pageSize?: number;
    search?: string;
    decision?: string;
    assigneeUserId?: string;
    reviewerUserId?: string;
    periodDays?: number | 'all';
  } = {}) => {
    const query = new URLSearchParams();
    if (input.page) query.set('page', String(input.page));
    if (input.pageSize) query.set('pageSize', String(input.pageSize));
    if (input.search?.trim()) query.set('search', input.search.trim());
    if (input.decision) query.set('decision', input.decision);
    if (input.assigneeUserId) query.set('assigneeUserId', input.assigneeUserId);
    if (input.reviewerUserId) query.set('reviewerUserId', input.reviewerUserId);
    if (input.periodDays) query.set('periodDays', String(input.periodDays));
    const suffix = query.toString();
    return apiJson<TransactionFollowUpApprovalHistoryPage>(
      `/api/transaction-follow-up/directives/approval-history${suffix ? `?${suffix}` : ''}`,
    );
  },

  approvalCenter: (input: {
    search?: string;
    priority?: string;
    assigneeUserId?: string;
  } = {}) => {
    const query = new URLSearchParams();
    if (input.search?.trim()) query.set('search', input.search.trim());
    if (input.priority) query.set('priority', input.priority);
    if (input.assigneeUserId) query.set('assigneeUserId', input.assigneeUserId);
    const suffix = query.toString();
    return apiJson<TransactionFollowUpApprovalCenter>(
      `/api/transaction-follow-up/directives/approval-center${suffix ? `?${suffix}` : ''}`,
    );
  },

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
      status: 'pending' | 'in_progress' | 'awaiting_approval' | 'cancelled';
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

  reviewDirective: (
    transactionId: string,
    directiveId: string,
    input: {
      decision: 'approved' | 'return_for_completion' | 'request_modification';
      reviewNote?: string | null;
    },
  ) =>
    apiJson<TransactionFollowUpDirective>(
      `/api/transaction-follow-up/${transactionId}/directives/${directiveId}/review`,
      {
        method: 'PATCH',
        body: JSON.stringify(input),
      },
    ),

  uploadDirectiveEvidence: async (
    transactionId: string,
    directiveId: string,
    file: File,
    notes?: string | null,
  ) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('fileName', file.name);

    const uploadResponse = await authenticatedFetch('/api/uploads', {
      method: 'POST',
      headers: { 'x-upload-module': 'transaction_follow_up' },
      body: formData,
    });
    const uploaded = await uploadResponse.json().catch(() => ({}));
    if (!uploadResponse.ok) {
      throw new Error(uploaded?.message || 'تعذر رفع ملف دليل التنفيذ');
    }

    try {
      return await apiJson<TransactionFollowUpDirectiveEvidence>(
        `/api/transaction-follow-up/${transactionId}/directives/${directiveId}/evidence`,
        {
          method: 'POST',
          body: JSON.stringify({
            title: file.name,
            driveUrl: uploaded.driveUrl,
            driveFileId: uploaded.driveFileId || null,
            mimeType: uploaded.mimeType || file.type || null,
            notes: notes || null,
          }),
        },
      );
    } catch (error) {
      if (uploaded.driveFileId) {
        void authenticatedFetch(`/api/uploads/${uploaded.driveFileId}`, {
          method: 'DELETE',
          headers: { 'x-upload-module': 'transaction_follow_up' },
        }).catch(() => undefined);
      }
      throw error;
    }
  },

  deleteDirectiveEvidence: (
    transactionId: string,
    directiveId: string,
    attachmentId: string,
  ) =>
    apiJson<void>(
      `/api/transaction-follow-up/${transactionId}/directives/${directiveId}/evidence/${attachmentId}`,
      { method: 'DELETE' },
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
