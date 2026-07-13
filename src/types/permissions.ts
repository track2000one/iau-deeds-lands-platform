// أنواع الصلاحيات
export type UserRole = 'admin' | 'employee';

export type ModuleName =
  | 'deeds' // الصكوك
  | 'allocated_lands' // الأراضي المخصصة
  | 'delivered_lands' // الأراضي المسلمة
  | 'leased_lands_out' // الأراضي المؤجرة (من الجامعة)
  | 'leased_lands_in' // الأراضي المستأجرة (للجامعة)
  | 'leased_buildings_out' // المباني المؤجرة (من الجامعة)
  | 'leased_buildings_in' // المباني المستأجرة (للجامعة)
  | 'reports' // التقارير
  | 'admin'; // لوحة التحكم

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

// الصلاحيات الافتراضية للمسؤول (جميع الصلاحيات)
export const ADMIN_PERMISSIONS: UserPermissions = {
  deeds: { canAdd: true, canEdit: true, canDelete: true, canPrint: true, canView: true },
  allocated_lands: { canAdd: true, canEdit: true, canDelete: true, canPrint: true, canView: true },
  delivered_lands: { canAdd: true, canEdit: true, canDelete: true, canPrint: true, canView: true },
  leased_lands_out: { canAdd: true, canEdit: true, canDelete: true, canPrint: true, canView: true },
  leased_lands_in: { canAdd: true, canEdit: true, canDelete: true, canPrint: true, canView: true },
  leased_buildings_out: { canAdd: true, canEdit: true, canDelete: true, canPrint: true, canView: true },
  leased_buildings_in: { canAdd: true, canEdit: true, canDelete: true, canPrint: true, canView: true },
  reports: { canAdd: true, canEdit: true, canDelete: true, canPrint: true, canView: true },
  admin: { canAdd: true, canEdit: true, canDelete: true, canPrint: true, canView: true },
};

// الصلاحيات الافتراضية للموظف (إضافة، تعديل، وطباعة)
export const EMPLOYEE_DEFAULT_PERMISSIONS: UserPermissions = {
  deeds: { canAdd: true, canEdit: true, canDelete: false, canPrint: true, canView: true },
  allocated_lands: { canAdd: true, canEdit: true, canDelete: false, canPrint: true, canView: true },
  delivered_lands: { canAdd: true, canEdit: true, canDelete: false, canPrint: true, canView: true },
  leased_lands_out: { canAdd: true, canEdit: true, canDelete: false, canPrint: true, canView: true },
  leased_lands_in: { canAdd: true, canEdit: true, canDelete: false, canPrint: true, canView: true },
  leased_buildings_out: { canAdd: true, canEdit: true, canDelete: false, canPrint: true, canView: true },
  leased_buildings_in: { canAdd: true, canEdit: true, canDelete: false, canPrint: true, canView: true },
  reports: { canAdd: false, canEdit: false, canDelete: false, canPrint: true, canView: true },
  admin: { canAdd: false, canEdit: false, canDelete: false, canPrint: false, canView: false },
};
