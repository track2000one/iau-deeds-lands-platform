import { apiJson } from '../../lib/http';

export type OrganizationUnitType =
  | 'assets_unit'
  | 'procurement'
  | 'warehouses'
  | 'inventory_control'
  | 'equipment'
  | 'ict'
  | 'beneficiary';

export type PermissionScope =
  | 'personal'
  | 'department'
  | 'sector'
  | 'university';

export type OrganizationUnit = {
  id: string;
  code: string;
  nameAr: string;
  nameEn?: string | null;
  unitType: OrganizationUnitType;
  parentId?: string | null;
  isBeneficiary: boolean;
  isActive: boolean;
  responsibility?: string | null;
  userCount: number;
  createdAt?: string;
  updatedAt?: string;
};

export type UserOrganizationAssignment = {
  userId: string;
  organizationUnitId: string | null;
  organizationRole: string | null;
  permissionScope: PermissionScope;
  organizationUnit: OrganizationUnit | null;
};

export type OrganizationUnitInput = {
  code: string;
  nameAr: string;
  nameEn?: string | null;
  unitType: OrganizationUnitType;
  parentId?: string | null;
  isBeneficiary: boolean;
  isActive: boolean;
  responsibility?: string | null;
};

export const getOrganizationUnits = () =>
  apiJson<OrganizationUnit[]>('/api/organization-units');

export const createOrganizationUnit = (input: OrganizationUnitInput) =>
  apiJson<OrganizationUnit>('/api/organization-units', {
    method: 'POST',
    body: JSON.stringify(input),
  });

export const updateOrganizationUnit = (
  id: string,
  input: OrganizationUnitInput
) =>
  apiJson<OrganizationUnit>(`/api/organization-units/${id}`, {
    method: 'PUT',
    body: JSON.stringify(input),
  });

export const getOrganizationAssignments = () =>
  apiJson<UserOrganizationAssignment[]>(
    '/api/organization-units/assignments/all'
  );

export const saveOrganizationAssignment = (
  userId: string,
  input: {
    organizationUnitId: string;
    organizationRole: string;
    permissionScope: PermissionScope;
  }
) =>
  apiJson<UserOrganizationAssignment>(
    `/api/organization-units/assignments/${userId}`,
    {
      method: 'PUT',
      body: JSON.stringify(input),
    }
  );

export const removeOrganizationAssignment = (userId: string) =>
  apiJson<void>(`/api/organization-units/assignments/${userId}`, {
    method: 'DELETE',
  });
