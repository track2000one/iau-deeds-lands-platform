import { apiJson } from '../../lib/http';

export type AccountingEvidenceAuditReconciliationDetail = {
  status: 'missing_mirror' | 'mismatch';
  recordId: string;
  recordNumber?: string | null;
  eventId?: string | null;
  requirementKey?: string | null;
  mirrorId: string;
  auditLogId?: string;
  serverCreatedAt?: string;
  fields?: string[];
};

export type AccountingEvidenceAuditOnlyDetail = {
  auditLogId: string;
  mirrorId?: string | null;
  entityLabel?: string | null;
  serverCreatedAt?: string;
};

export type AccountingEvidenceAuditReconciliationResult = {
  checkedAt: string;
  repairMissing: boolean;
  recordsScanned: number;
  expectedEvents: number;
  verified: number;
  missingBeforeRepair: number;
  repaired: number;
  remainingMissing: number;
  mismatched: number;
  auditOnly: number;
  status: 'ok' | 'needs_attention';
  details: AccountingEvidenceAuditReconciliationDetail[];
  auditOnlyDetails: AccountingEvidenceAuditOnlyDetail[];
  notes?: {
    auditOnly?: string;
    mismatch?: string;
  };
};

export const getAccountingEvidenceAuditReconciliation = (detailLimit = 250) =>
  apiJson<AccountingEvidenceAuditReconciliationResult>(
    `/api/accounting-transformation/admin/evidence-audit/reconciliation?detailLimit=${encodeURIComponent(String(detailLimit))}`
  );

export const backfillAccountingEvidenceAuditMissingMirrors = (detailLimit = 250) =>
  apiJson<AccountingEvidenceAuditReconciliationResult>(
    '/api/accounting-transformation/admin/evidence-audit/reconciliation/backfill',
    {
      method: 'POST',
      body: JSON.stringify({ detailLimit }),
    }
  );
