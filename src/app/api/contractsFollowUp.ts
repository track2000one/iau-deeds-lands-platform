import { apiJson } from '../../lib/http';

export type ContractFollowUpStatus =
  | 'not_started'
  | 'in_progress'
  | 'renewed'
  | 'not_renewing'
  | 'closed';

export type ContractFollowUpRecord = {
  id: string;
  contractKey: string;
  status: ContractFollowUpStatus;
  assignedTo?: string | null;
  action?: string | null;
  notes?: string | null;
  nextFollowUpDate?: string | null;
  updatedBy?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ContractFollowUpInput = {
  status: ContractFollowUpStatus;
  assignedTo?: string | null;
  action?: string | null;
  notes?: string | null;
  nextFollowUpDate?: string | null;
};

export const getContractFollowUps = () =>
  apiJson<ContractFollowUpRecord[]>('/api/contracts/follow-up');

export const saveContractFollowUp = (
  contractKey: string,
  input: ContractFollowUpInput
) =>
  apiJson<ContractFollowUpRecord>(
    `/api/contracts/follow-up/${encodeURIComponent(contractKey)}`,
    {
      method: 'PUT',
      body: JSON.stringify(input),
    }
  );
