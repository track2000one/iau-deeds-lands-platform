export type UserRole = 'admin' | 'employee';

export type ModuleName =
  | 'deeds'
  | 'allocated_lands'
  | 'delivered_lands'
  | 'leased_lands_out'
  | 'leased_lands_in'
  | 'leased_buildings_out'
  | 'leased_buildings_in'
  | 'archive'
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
  archive: 'الأرشفة',
  reports: 'التقارير',
  admin: 'لوحة التحكم',
  audit: 'سجل العمليات',
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
  archive: { ...NONE },
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
  archive: { ...FULL },
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
