export type AuditStatus = 'success' | 'failed';

export type AuditAction =
  | 'login'
  | 'logout'
  | 'create'
  | 'update'
  | 'delete'
  | 'upload'
  | string;

export interface AuditLogItem {
  id: string;
  userId: string | null;
  username: string | null;
  userEmail: string | null;
  userRole: string | null;
  action: AuditAction;
  module: string;
  entity: string | null;
  entityId: string | null;
  entityLabel: string | null;
  status: AuditStatus;
  description: string | null;
  previousData: unknown;
  newData: unknown;
  metadata: unknown;
  ipAddress: string | null;
  userAgent: string | null;
  errorMessage: string | null;
  createdAt: string;
}

export interface AuditStats {
  total: number;
  today: number;
  create: number;
  update: number;
  delete: number;
  failed: number;
  failedLogins: number;
  activeUsersToday: number;
}

export interface AuditListResponse {
  items: AuditLogItem[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface AuditFiltersResponse {
  users: Array<{
    userId: string | null;
    username: string | null;
    userEmail: string | null;
  }>;
  actions: string[];
  modules: string[];
}
