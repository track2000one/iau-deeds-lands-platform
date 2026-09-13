import { apiJson } from '../../lib/http';

export type BackendDeploymentHealth = {
  ok: boolean;
  service: string;
  time: string;
  startedAt?: string;
  uptimeSeconds?: number;
  deployment?: {
    commitSha?: string | null;
    deploymentId?: string | null;
    environment?: string | null;
    serviceName?: string | null;
  };
  capabilities?: string[];
};

export const ACCOUNTING_AUDIT_REQUIRED_CAPABILITIES = [
  'accounting_evidence_audit_mirror_v1',
  'accounting_evidence_audit_reconciliation_v1',
  'accounting_evidence_audit_backfill_missing_only_v1',
] as const;

export const getBackendDeploymentHealth = () => apiJson<BackendDeploymentHealth>('/api/health');

export const backendSupportsAccountingAuditReconciliation = (health: BackendDeploymentHealth | null | undefined) => {
  if (!health?.ok) return false;
  const capabilities = new Set(health.capabilities || []);
  return ACCOUNTING_AUDIT_REQUIRED_CAPABILITIES.every((capability) => capabilities.has(capability));
};
