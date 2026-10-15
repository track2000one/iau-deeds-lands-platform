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
  items: TransactionRiskRecord[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
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
