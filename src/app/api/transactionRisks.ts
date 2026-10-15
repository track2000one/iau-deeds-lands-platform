import { apiJson } from '../../lib/http';

export type TransactionRiskMetricKey =
  | 'firstPassRate'
  | 'onTimeRate'
  | 'reworkRate'
  | 'avgExecutionHours'
  | 'avgApprovalHours';

export type TransactionRiskCategory =
  | 'operational'
  | 'process'
  | 'workload'
  | 'compliance'
  | 'technology'
  | 'data'
  | 'financial'
  | 'reputational'
  | 'other';

export type TransactionRiskLevel = 'low' | 'medium' | 'high' | 'critical';
export type TransactionRiskStatus = 'open' | 'monitoring' | 'controlled' | 'accepted' | 'closed';
export type TransactionRiskTreatmentStrategy = 'reduce' | 'avoid' | 'transfer' | 'accept';
export type TransactionRiskSourceType = 'manual' | 'early_warning' | 'preventive_action' | 'capa';
export type TransactionRiskAcceptanceStatus = 'pending' | 'approved' | 'rejected' | 'cancelled' | 'expired';
export type TransactionRiskPolicyStatus = 'default' | 'pending' | 'approved' | 'rejected' | 'cancelled';
export type TransactionRiskKriKey =
  | 'outsideAppetiteRate'
  | 'criticalRisks'
  | 'overdueReviewRate'
  | 'recurringRiskRate'
  | 'riskReduction'
  | 'preventiveFailureRate'
  | 'predictedBreaches'
  | 'capaOverdue'
  | 'pendingRiskAcceptances'
  | 'expiringRiskAcceptances';

export type TransactionRiskKriThreshold = {
  direction: 'max' | 'min';
  target: number;
  warning: number;
  danger: number;
};

export type TransactionRiskCategoryAppetite = Record<TransactionRiskCategory, number>;

export type TransactionRiskPolicy = {
  id: string | null;
  versionNumber: number;
  name: string;
  statement: string;
  appetiteMaxScore: number;
  categoryAppetite: TransactionRiskCategoryAppetite;
  kriThresholds: Record<TransactionRiskKriKey, TransactionRiskKriThreshold>;
  effectiveFrom?: string | null;
  effectiveTo?: string | null;
  status: TransactionRiskPolicyStatus;
  changeReason: string;
  proposedById?: string | null;
  proposedByName: string;
  reviewedById?: string | null;
  reviewedByName?: string | null;
  reviewComment?: string | null;
  submittedAt?: string | null;
  decisionAt?: string | null;
  cancelledAt?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
};

export type TransactionRiskPolicyResponse = {
  generatedAt: string;
  supervisor: boolean;
  current: TransactionRiskPolicy;
  pending: TransactionRiskPolicy[];
  history: TransactionRiskPolicy[];
  defaults: TransactionRiskPolicy;
};

export type TransactionRiskPolicyProposalInput = {
  name: string;
  statement: string;
  appetiteMaxScore: number;
  categoryAppetite: TransactionRiskCategoryAppetite;
  kriThresholds: Record<TransactionRiskKriKey, TransactionRiskKriThreshold>;
  effectiveFrom: string;
  changeReason: string;
};

export type TransactionRiskEvent = {
  id: string;
  riskId: string;
  action: string;
  fromStatus?: string | null;
  toStatus?: string | null;
  probability?: number | null;
  impact?: number | null;
  residualProbability?: number | null;
  residualImpact?: number | null;
  residualScore?: number | null;
  residualLevel?: TransactionRiskLevel | null;
  note?: string | null;
  changedById?: string | null;
  changedByName?: string | null;
  createdAt: string;
};

export type TransactionRiskAcceptanceRequest = {
  id: string;
  riskId: string;
  justification: string;
  compensatingControls?: string[] | null;
  requestedUntil: string;
  status: TransactionRiskAcceptanceStatus;
  requestedById: string;
  requestedByName: string;
  reviewedById?: string | null;
  reviewedByName?: string | null;
  reviewComment?: string | null;
  decisionAt?: string | null;
  cancelledAt?: string | null;
  expiredAt?: string | null;
  createdAt: string;
  updatedAt: string;
  risk?: {
    id: string;
    riskNumber: string;
    title: string;
    category?: TransactionRiskCategory;
    ownerUserId?: string;
    ownerName?: string;
    assigneeUserId?: string | null;
    assigneeName?: string | null;
    residualScore: number;
    residualLevel: TransactionRiskLevel;
    status: TransactionRiskStatus;
    acceptanceExpiresAt?: string | null;
  };
};

export type TransactionRiskAcceptancePage = {
  generatedAt: string;
  supervisor: boolean;
  summary: {
    pending: number;
    activeApproved: number;
    expiringSoon: number;
    rejected30d: number;
    expired30d: number;
  };
  items: TransactionRiskAcceptanceRequest[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

export type TransactionRiskRecord = {
  id: string;
  riskNumber: string;
  title: string;
  description: string;
  category: TransactionRiskCategory;
  sourceType: TransactionRiskSourceType;
  metricKey?: TransactionRiskMetricKey | null;
  metricLabel?: string | null;
  scopeType: 'global' | 'employee';
  assigneeUserId?: string | null;
  assigneeName?: string | null;
  ownerUserId: string;
  ownerName: string;
  probability: number;
  impact: number;
  inherentScore: number;
  inherentLevel: TransactionRiskLevel;
  controls?: string[] | null;
  treatmentStrategy: TransactionRiskTreatmentStrategy;
  treatmentPlan?: string | null;
  residualProbability: number;
  residualImpact: number;
  residualScore: number;
  residualLevel: TransactionRiskLevel;
  reviewDate?: string | null;
  status: TransactionRiskStatus;
  sourcePreventiveActionId?: string | null;
  sourceImprovementPlanId?: string | null;
  recurrenceCount: number;
  lastOccurrenceAt?: string | null;
  notes?: string | null;
  closedAt?: string | null;
  acceptanceExpiresAt?: string | null;
  acceptanceApprovedAt?: string | null;
  acceptanceApprovedById?: string | null;
  acceptanceApprovedByName?: string | null;
  acceptanceReason?: string | null;
  latestAcceptance?: TransactionRiskAcceptanceRequest | null;
  acceptanceExpiresSoon?: boolean;
  appetiteLimit?: number;
  outsideAppetite?: boolean;
  createdById?: string | null;
  createdByName?: string | null;
  updatedById?: string | null;
  updatedByName?: string | null;
  createdAt: string;
  updatedAt: string;
  isReviewOverdue?: boolean;
  events?: TransactionRiskEvent[];
};

export type TransactionRiskPage = {
  generatedAt: string;
  supervisor: boolean;
  summary: {
    active: number;
    highCritical: number;
    controlled: number;
    overdueReview: number;
    averageResidualScore: number | null;
  };
  levels: Array<{ level: TransactionRiskLevel; count: number }>;
  matrix: Array<{ probability: number; impact: number; count: number }>;
  categories: Array<{ category: TransactionRiskCategory; count: number }>;
  policy?: {
    id: string | null;
    versionNumber: number;
    name: string;
    appetiteMaxScore: number;
    categoryAppetite: TransactionRiskCategoryAppetite;
    effectiveFrom?: string | null;
  };
  items: TransactionRiskRecord[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

export type TransactionRiskDashboard = {
  generatedAt: string;
  appetite: {
    policyId?: string | null;
    versionNumber: number;
    policyName: string;
    effectiveFrom?: string | null;
    maxResidualScore: number;
    categoryLimits: TransactionRiskCategoryAppetite;
    level: TransactionRiskLevel;
    status: 'within' | 'watch' | 'breached';
    withinCount: number;
    outsideCount: number;
    outsideRate: number;
    statement: string;
  };
  summary: {
    active: number;
    critical: number;
    high: number;
    medium: number;
    low: number;
    outsideAppetite: number;
    overdueReview: number;
    recurring: number;
    accepted: number;
    controlled: number;
    averageInherentScore: number | null;
    averageResidualScore: number | null;
    averageRiskReductionPercent: number | null;
    treatmentCoveragePercent: number;
  };
  kri: Array<{
    key: string;
    label: string;
    value: number | null;
    unit: string;
    status: 'green' | 'yellow' | 'red' | 'neutral';
    target: string;
    threshold?: TransactionRiskKriThreshold;
    description: string;
  }>;
  topRisks: Array<Pick<
    TransactionRiskRecord,
    | 'id'
    | 'riskNumber'
    | 'title'
    | 'category'
    | 'ownerUserId'
    | 'ownerName'
    | 'status'
    | 'inherentScore'
    | 'residualScore'
    | 'residualLevel'
    | 'recurrenceCount'
    | 'reviewDate'
    | 'isReviewOverdue'
    | 'treatmentStrategy'
  >>;
  owners: Array<{
    ownerUserId: string | null;
    ownerName: string;
    active: number;
    outsideAppetite: number;
    overdueReview: number;
    averageResidualScore: number;
    riskReductionPercent: number | null;
  }>;
  categories: Array<{
    category: TransactionRiskCategory;
    active: number;
    outsideAppetite: number;
    averageResidualScore: number;
  }>;
  statuses: Array<{ status: TransactionRiskStatus; count: number }>;
  treatmentStrategies: Array<{ strategy: TransactionRiskTreatmentStrategy; count: number }>;
  trend: Array<{
    key: string;
    year: number;
    month: number;
    created: number;
    closed: number;
    reassessed: number;
    highCriticalAssessments: number;
  }>;
  earlyWarning: {
    summary: {
      atRiskMetrics: number;
      predictedMetricBreaches: number;
      atRiskEmployees: number;
      criticalEmployees: number;
      highRiskEmployees: number;
      mediumRiskEmployees: number;
    };
    metrics: Array<{
      metricKey: TransactionRiskMetricKey;
      metricLabel: string;
      currentValue: number | null;
      projectedValue: number | null;
      target: number;
      direction: 'min' | 'max';
      currentStatus: 'green' | 'yellow' | 'red' | 'neutral';
      projectedStatus: 'green' | 'yellow' | 'red' | 'neutral';
      riskScore: number;
      riskLevel: 'low' | 'medium' | 'high' | 'critical';
      reasons: string[];
      recommendation: string;
    }>;
    employees: Array<{
      userId: string;
      username: string;
      riskScore: number;
      riskLevel: 'low' | 'medium' | 'high' | 'critical';
      overdueOpen: number;
      urgentOpen: number;
      returnedOpen: number;
      openDirectives: number;
      reasons: string[];
      recommendation: string;
    }>;
  };
  preventive: {
    periodDays: number;
    total: number;
    verified: number;
    effective: number;
    failed: number;
    overdue: number;
    failureRate: number;
  };
  capa: {
    open: number;
    overdue: number;
  };
  acceptance: {
    pending: number;
    activeApproved: number;
    expiringSoon: number;
    rejected30d: number;
    expired30d: number;
    acceptedOutsideAppetite: number;
  };
};

export type TransactionRiskCreateInput = {
  title: string;
  description: string;
  category: TransactionRiskCategory;
  sourceType: TransactionRiskSourceType;
  metricKey?: TransactionRiskMetricKey | null;
  scopeType: 'global' | 'employee';
  assigneeUserId?: string | null;
  ownerUserId: string;
  probability: number;
  impact: number;
  controls?: string[];
  treatmentStrategy: TransactionRiskTreatmentStrategy;
  treatmentPlan?: string | null;
  residualProbability?: number;
  residualImpact?: number;
  reviewDate?: string | null;
  sourcePreventiveActionId?: string | null;
  sourceImprovementPlanId?: string | null;
  recurrenceCount?: number;
  notes?: string | null;
};

export type TransactionRiskUpdateInput = Partial<{
  title: string;
  description: string;
  category: TransactionRiskCategory;
  ownerUserId: string | null;
  probability: number;
  impact: number;
  controls: string[];
  treatmentStrategy: TransactionRiskTreatmentStrategy;
  treatmentPlan: string | null;
  residualProbability: number;
  residualImpact: number;
  reviewDate: string | null;
  status: TransactionRiskStatus;
  recurrenceCount: number;
  notes: string | null;
}>;

export const transactionRiskApi = {
  dashboard: () =>
    apiJson<TransactionRiskDashboard>('/api/transaction-follow-up/directives/risk-dashboard'),

  policy: () =>
    apiJson<TransactionRiskPolicyResponse>('/api/transaction-follow-up/directives/risk-policy'),

  proposePolicy: (input: TransactionRiskPolicyProposalInput) =>
    apiJson<TransactionRiskPolicy>('/api/transaction-follow-up/directives/risk-policy/proposals', {
      method: 'POST',
      body: JSON.stringify(input),
    }),

  decidePolicy: (
    proposalId: string,
    input: { decision: 'approved' | 'rejected'; reviewComment: string },
  ) =>
    apiJson<TransactionRiskPolicy>(
      `/api/transaction-follow-up/directives/risk-policy/proposals/${proposalId}/decision`,
      {
        method: 'PATCH',
        body: JSON.stringify(input),
      },
    ),

  cancelPolicy: (proposalId: string) =>
    apiJson<TransactionRiskPolicy>(
      `/api/transaction-follow-up/directives/risk-policy/proposals/${proposalId}/cancel`,
      {
        method: 'PATCH',
        body: JSON.stringify({}),
      },
    ),

  acceptances: (input: {
    page?: number;
    pageSize?: number;
    status?: TransactionRiskAcceptanceStatus | '';
  } = {}) => {
    const query = new URLSearchParams();
    if (input.page) query.set('page', String(input.page));
    if (input.pageSize) query.set('pageSize', String(input.pageSize));
    if (input.status) query.set('status', input.status);
    const suffix = query.toString();
    return apiJson<TransactionRiskAcceptancePage>(
      `/api/transaction-follow-up/directives/risk-acceptances${suffix ? `?${suffix}` : ''}`,
    );
  },

  requestAcceptance: (
    riskId: string,
    input: {
      justification: string;
      compensatingControls?: string[];
      requestedUntil: string;
    },
  ) =>
    apiJson<TransactionRiskAcceptanceRequest>(
      `/api/transaction-follow-up/directives/risks/${riskId}/acceptance-requests`,
      {
        method: 'POST',
        body: JSON.stringify(input),
      },
    ),

  decideAcceptance: (
    requestId: string,
    input: {
      decision: 'approved' | 'rejected';
      reviewComment: string;
    },
  ) =>
    apiJson<TransactionRiskAcceptanceRequest>(
      `/api/transaction-follow-up/directives/risk-acceptances/${requestId}/decision`,
      {
        method: 'PATCH',
        body: JSON.stringify(input),
      },
    ),

  cancelAcceptance: (requestId: string) =>
    apiJson<TransactionRiskAcceptanceRequest>(
      `/api/transaction-follow-up/directives/risk-acceptances/${requestId}/cancel`,
      {
        method: 'PATCH',
        body: JSON.stringify({}),
      },
    ),

  list: (input: {
    page?: number;
    pageSize?: number;
    status?: string;
    level?: string;
    category?: string;
  } = {}) => {
    const query = new URLSearchParams();
    if (input.page) query.set('page', String(input.page));
    if (input.pageSize) query.set('pageSize', String(input.pageSize));
    if (input.status) query.set('status', input.status);
    if (input.level) query.set('level', input.level);
    if (input.category) query.set('category', input.category);
    const suffix = query.toString();
    return apiJson<TransactionRiskPage>(
      `/api/transaction-follow-up/directives/risks${suffix ? `?${suffix}` : ''}`,
    );
  },

  create: (input: TransactionRiskCreateInput) =>
    apiJson<TransactionRiskRecord>('/api/transaction-follow-up/directives/risks', {
      method: 'POST',
      body: JSON.stringify(input),
    }),

  update: (id: string, input: TransactionRiskUpdateInput) =>
    apiJson<TransactionRiskRecord>(`/api/transaction-follow-up/directives/risks/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(input),
    }),
};

export default transactionRiskApi;
