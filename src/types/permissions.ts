export type UserRole = 'admin' | 'employee';

export type ModuleName =
  | 'deeds'
  | 'allocated_lands'
  | 'delivered_lands'
  | 'leased_lands_out'
  | 'leased_lands_in'
  | 'leased_buildings_out'
  | 'leased_buildings_in'
  | 'contracts_follow_up'
  | 'assets'
  | 'mosques'
  | 'archive'
  | 'site_inspections'
  | 'reports'
  | 'admin'
  | 'audit';

export interface ModulePermissions {
  canView: boolean;
  canAdd: boolean;
  canEdit: boolean;
  canDelete: boolean;
  canPrint: boolean;
}

export type UserPermissions = Record<ModuleName, ModulePermissions>;

export interface UserProfile {
  uid: string;
  email: string;
  username: string;
  role: UserRole;
  isActive: boolean;
  activationPending?: boolean;
  activationExpires?: Date | null;
  activationSentAt?: Date | null;
  activatedAt?: Date | null;
  permissions: UserPermissions;
  createdAt: Date;
  updatedAt: Date;
  lastLoginAt?: Date | null;
}

export const MODULE_LABELS: Record<ModuleName, string> = {
  deeds: 'الصكوك',
  allocated_lands: 'الأراضي المخصصة',
  delivered_lands: 'الأراضي المستلمة',
  leased_lands_out: 'الأراضي المؤجرة',
  leased_lands_in: 'الأراضي المستأجرة',
  leased_buildings_out: 'المباني المؤجرة',
  leased_buildings_in: 'المباني المستأجرة',
  contracts_follow_up: 'متابعة العقود',
  assets: 'وحدة الأصول',
  mosques: 'وحدة العناية بالمساجد والمصليات الجامعية',
  archive: 'الأرشفة',
  site_inspections: 'المعاينات الميدانية',
  reports: 'التقارير',
  admin: 'لوحة التحكم',
  audit: 'سجل العمليات',
};

export const MODULE_LABELS_EN: Record<ModuleName, string> = {
  deeds: 'Deeds',
  allocated_lands: 'Allocated Lands',
  delivered_lands: 'Delivered Lands',
  leased_lands_out: 'Leased Lands (Out)',
  leased_lands_in: 'Leased Lands (In)',
  leased_buildings_out: 'Leased Buildings (Out)',
  leased_buildings_in: 'Leased Buildings (In)',
  contracts_follow_up: 'Contract Follow-up',
  assets: 'Assets Unit',
  mosques: 'University Mosques & Prayer Rooms Care Unit',
  archive: 'Archive',
  site_inspections: 'Field Inspections',
  reports: 'Reports',
  admin: 'Admin Dashboard',
  audit: 'Audit Log',
};

const FULL: ModulePermissions = {
  canView: true,
  canAdd: true,
  canEdit: true,
  canDelete: true,
  canPrint: true,
};

const NONE: ModulePermissions = {
  canView: false,
  canAdd: false,
  canEdit: false,
  canDelete: false,
  canPrint: false,
};

export const createEmptyPermissions = (): UserPermissions => ({
  deeds: { ...NONE },
  allocated_lands: { ...NONE },
  delivered_lands: { ...NONE },
  leased_lands_out: { ...NONE },
  leased_lands_in: { ...NONE },
  leased_buildings_out: { ...NONE },
  leased_buildings_in: { ...NONE },
  contracts_follow_up: { ...NONE },
  assets: { ...NONE },
  mosques: { ...NONE },
  archive: { ...NONE },
  site_inspections: { ...NONE },
  reports: { ...NONE },
  admin: { ...NONE },
  audit: { ...NONE },
});

export const ADMIN_PERMISSIONS: UserPermissions = {
  deeds: { ...FULL },
  allocated_lands: { ...FULL },
  delivered_lands: { ...FULL },
  leased_lands_out: { ...FULL },
  leased_lands_in: { ...FULL },
  leased_buildings_out: { ...FULL },
  leased_buildings_in: { ...FULL },
  contracts_follow_up: { ...FULL },
  assets: { ...FULL },
  mosques: { ...FULL },
  archive: { ...FULL },
  site_inspections: { ...FULL },
  reports: { ...FULL },
  admin: { ...FULL },
  audit: { ...FULL },
};

export const EMPLOYEE_DEFAULT_PERMISSIONS = createEmptyPermissions();

export const normalizePermissions = (
  permissions?: Partial<UserPermissions> | null
): UserPermissions => {
  const output = createEmptyPermissions();

  for (const moduleName of Object.keys(output) as ModuleName[]) {
    output[moduleName] = {
      ...output[moduleName],
      ...(permissions?.[moduleName] || {}),
    };

    if (
      output[moduleName].canAdd ||
      output[moduleName].canEdit ||
      output[moduleName].canDelete ||
      output[moduleName].canPrint
    ) {
      output[moduleName].canView = true;
    }
  }

  return output;
};

export const getPermissionsByRole = (
  role: UserRole,
  permissions?: Partial<UserPermissions> | null
): UserPermissions =>
  role === 'admin' ? ADMIN_PERMISSIONS : normalizePermissions(permissions);
