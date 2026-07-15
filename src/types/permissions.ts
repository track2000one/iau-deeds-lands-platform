// أنواع الصلاحيات
export type UserRole = 'admin' | 'employee';

export type ModuleName =
  | 'deeds'
  | 'allocated_lands'
  | 'delivered_lands'
  | 'leased_lands_out'
  | 'leased_lands_in'
  | 'leased_buildings_out'
  | 'leased_buildings_in'
  | 'reports'
  | 'admin';

export interface ModulePermissions {
  canAdd: boolean;
  canEdit: boolean;
  canDelete: boolean;
  canPrint: boolean;
  canView: boolean;
}

export interface UserPermissions {
  deeds: ModulePermissions;
  allocated_lands: ModulePermissions;
  delivered_lands: ModulePermissions;
  leased_lands_out: ModulePermissions;
  leased_lands_in: ModulePermissions;
  leased_buildings_out: ModulePermissions;
  leased_buildings_in: ModulePermissions;
  reports: ModulePermissions;
  admin: ModulePermissions;
}

export interface UserProfile {
  uid: string;
  email: string;
  username: string;
  role: UserRole;
  permissions: UserPermissions;
  createdAt: Date;
  updatedAt: Date;
}

const FULL_ACCESS: ModulePermissions = {
  canAdd: true,
  canEdit: true,
  canDelete: true,
  canPrint: true,
  canView: true,
};

const VIEW_ONLY: ModulePermissions = {
  canAdd: false,
  canEdit: false,
  canDelete: false,
  canPrint: true,
  canView: true,
};

const NO_ACCESS: ModulePermissions = {
  canAdd: false,
  canEdit: false,
  canDelete: false,
  canPrint: false,
  canView: false,
};

// الصلاحيات الافتراضية للمسؤول: جميع الصلاحيات
export const ADMIN_PERMISSIONS: UserPermissions = {
  deeds: FULL_ACCESS,
  allocated_lands: FULL_ACCESS,
  delivered_lands: FULL_ACCESS,
  leased_lands_out: FULL_ACCESS,
  leased_lands_in: FULL_ACCESS,
  leased_buildings_out: FULL_ACCESS,
  leased_buildings_in: FULL_ACCESS,
  reports: FULL_ACCESS,
  admin: FULL_ACCESS,
};

// الصلاحيات الافتراضية للمستخدم المحدود: عرض وطباعة فقط بدون إضافة أو تعديل أو حذف
export const EMPLOYEE_DEFAULT_PERMISSIONS: UserPermissions = {
  deeds: VIEW_ONLY,
  allocated_lands: VIEW_ONLY,
  delivered_lands: VIEW_ONLY,
  leased_lands_out: VIEW_ONLY,
  leased_lands_in: VIEW_ONLY,
  leased_buildings_out: VIEW_ONLY,
  leased_buildings_in: VIEW_ONLY,
  reports: VIEW_ONLY,
  admin: NO_ACCESS,
};

export const getPermissionsByRole = (role: UserRole): UserPermissions => {
  return role === 'admin' ? ADMIN_PERMISSIONS : EMPLOYEE_DEFAULT_PERMISSIONS;
};
