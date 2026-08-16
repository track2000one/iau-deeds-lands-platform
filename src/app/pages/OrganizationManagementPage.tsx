import React, { useEffect, useMemo, useState } from 'react';
import {
  Building2,
  Edit3,
  Network,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  UserPlus,
  Users,
} from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '../../context/AuthContext';
import { apiJson } from '../../lib/http';
import {
  createEmptyPermissions,
  type UserPermissions,
  type UserProfile,
  type UserRole,
} from '../../types/permissions';
import {
  createOrganizationUnit,
  getOrganizationAssignments,
  getOrganizationUnits,
  removeOrganizationAssignment,
  saveOrganizationAssignment,
  updateOrganizationUnit,
  type OrganizationUnit,
  type OrganizationUnitInput,
  type OrganizationUnitType,
  type PermissionScope,
  type UserOrganizationAssignment,
} from '../api/organization';
import { PermissionMatrix } from '../components/PermissionMatrix';
import { Alert, AlertDescription, AlertTitle } from '../components/ui/alert';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '../components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../components/ui/dialog';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { NativeSelect } from '../components/ui/native-select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';

type RolePreset = {
  key: string;
  label: string;
  description: string;
};

const ROLE_PRESETS: Record<OrganizationUnitType, RolePreset[]> = {
  assets_unit: [
    {
      key: 'asset_manager',
      label: 'مدير الأصول',
      description: 'الإشراف والاعتماد والتفعيل وإغلاق دورة حياة الأصل.',
    },
    {
      key: 'asset_registrar',
      label: 'مسجل الأصول',
      description: 'تسجيل بيانات الأصل وإنشاء الرقم والباركود ومتابعة اكتمال البيانات.',
    },
    {
      key: 'asset_followup',
      label: 'موظف متابعة الأصول',
      description: 'متابعة العهد والنقل والإرجاع وحالات الأصول.',
    },
  ],
  procurement: [
    {
      key: 'procurement_employee',
      label: 'موظف مشتريات',
      description: 'بيانات أوامر الشراء والعقود والتوريد.',
    },
    {
      key: 'procurement_supervisor',
      label: 'مشرف المشتريات',
      description: 'مراجعة بيانات التوريد والإشراف على المعاملات.',
    },
    {
      key: 'procurement_manager',
      label: 'مدير المشتريات',
      description: 'الاعتماد والإشراف وفق مستوى الصلاحية.',
    },
  ],
  warehouses: [
    {
      key: 'receiving_employee',
      label: 'موظف استلام',
      description: 'إثبات الاستلام الفعلي ومطابقة الكميات والبيانات الأولية.',
    },
    {
      key: 'warehouse_keeper',
      label: 'أمين مستودع',
      description: 'إدارة مواقع التخزين والموجودات بالمستودع.',
    },
    {
      key: 'issuing_employee',
      label: 'موظف صرف',
      description: 'تنفيذ أوامر الصرف والتسليم بعد الاعتماد.',
    },
    {
      key: 'returns_employee',
      label: 'موظف مرتجعات',
      description: 'استلام الأصول المعادة وتوجيهها للفحص.',
    },
    {
      key: 'warehouse_manager',
      label: 'مدير المستودعات',
      description: 'الإشراف والاعتمادات التشغيلية للمستودعات.',
    },
  ],
  inventory_control: [
    {
      key: 'inventory_controller',
      label: 'مراقب مخزون',
      description: 'المطابقة والتحقق والرقابة على بيانات الموجودات.',
    },
    {
      key: 'inventory_member',
      label: 'عضو جرد',
      description: 'تنفيذ الجرد الميداني بالباركود أو رمز QR.',
    },
    {
      key: 'inventory_supervisor',
      label: 'مشرف مراقبة المخزون',
      description: 'اعتماد نتائج المطابقة والجرد والتدقيق.',
    },
  ],
  equipment: [
    {
      key: 'equipment_inspector',
      label: 'فاحص تجهيزات',
      description: 'الفحص الفني للأثاث والتجهيزات وتسجيل النتيجة.',
    },
    {
      key: 'equipment_supervisor',
      label: 'مشرف التجهيزات',
      description: 'مراجعة واعتماد نتائج فحص التجهيزات.',
    },
  ],
  ict: [
    {
      key: 'technical_inspector',
      label: 'فاحص تقني',
      description: 'الفحص الفني للأجهزة والأنظمة التقنية.',
    },
    {
      key: 'technical_supervisor',
      label: 'مشرف فني',
      description: 'اعتماد التقارير ونتائج الفحص الفني.',
    },
    {
      key: 'technical_officer',
      label: 'مسؤول تقني',
      description: 'تقييم الأجهزة المرتجعة أو المتعطلة ومتابعة حالتها.',
    },
  ],
  beneficiary: [
    {
      key: 'requester',
      label: 'مقدم طلب',
      description: 'إنشاء طلبات الأصول ومتابعتها.',
    },
    {
      key: 'custodian',
      label: 'مسؤول عهدة',
      description: 'استلام الأصل والمحافظة عليه وإدارة العهدة المسندة إليه.',
    },
    {
      key: 'asset_coordinator',
      label: 'منسق أصول بالجهة',
      description: 'متابعة جميع أصول الجهة وطلبات النقل والإرجاع.',
    },
    {
      key: 'entity_manager',
      label: 'مدير الجهة',
      description: 'اعتماد طلبات الجهة والإشراف على أصولها.',
    },
    {
      key: 'beneficiary_employee',
      label: 'موظف مستفيد',
      description: 'عرض الأصول المسندة إليه ورفع الطلبات المسموح بها.',
    },
  ],
};

const UNIT_TYPE_LABELS: Record<OrganizationUnitType, string> = {
  assets_unit: 'إدارة الأصول',
  procurement: 'المشتريات والمناقصات',
  warehouses: 'المستودعات',
  inventory_control: 'مراقبة المخزون',
  equipment: 'التجهيزات',
  ict: 'تقنية المعلومات',
  beneficiary: 'جهة مستفيدة',
};

const SCOPE_LABELS: Record<PermissionScope, string> = {
  personal: 'شخصي',
  department: 'الجهة',
  sector: 'القطاع',
  university: 'الجامعة',
};

const permissionsForOrganizationRole = (
  organizationRole: string,
  accountRole: UserRole
): UserPermissions => {
  const permissions = createEmptyPermissions();

  if (accountRole === 'admin') return permissions;

  permissions.assets.canView = true;
  permissions.assets.canPrint = true;

  if (
    ['asset_manager', 'asset_registrar', 'asset_followup'].includes(
      organizationRole
    )
  ) {
    permissions.assets.canAdd = true;
    permissions.assets.canEdit = true;
  }

  return permissions;
};

type UserForm = {
  username: string;
  email: string;
  password: string;
  role: UserRole;
  isActive: boolean;
  organizationUnitId: string;
  organizationRole: string;
  permissionScope: PermissionScope;
  permissions: UserPermissions;
};

const emptyUserForm = (): UserForm => ({
  username: '',
  email: '',
  password: '',
  role: 'employee',
  isActive: true,
  organizationUnitId: '',
  organizationRole: '',
  permissionScope: 'department',
  permissions: createEmptyPermissions(),
});

type UnitForm = OrganizationUnitInput;

const emptyUnitForm = (): UnitForm => ({
  code: '',
  nameAr: '',
  nameEn: '',
  unitType: 'beneficiary',
  parentId: 'org-ben',
  isBeneficiary: true,
  isActive: true,
  responsibility: '',
});

type CreatedUserResponse = {
  uid: string;
};

export const OrganizationManagementPage: React.FC = () => {
  const {
    users,
    refreshUsers,
    updateEmployee,
  } = useAuth();

  const [activeTab, setActiveTab] = useState('units');
  const [units, setUnits] = useState<OrganizationUnit[]>([]);
  const [assignments, setAssignments] = useState<UserOrganizationAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [unitFilter, setUnitFilter] = useState('all');

  const [userDialogOpen, setUserDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserProfile | null>(null);
  const [userForm, setUserForm] = useState<UserForm>(emptyUserForm());
  const [savingUser, setSavingUser] = useState(false);

  const [unitDialogOpen, setUnitDialogOpen] = useState(false);
  const [editingUnit, setEditingUnit] = useState<OrganizationUnit | null>(null);
  const [unitForm, setUnitForm] = useState<UnitForm>(emptyUnitForm());
  const [savingUnit, setSavingUnit] = useState(false);

  const assignmentByUserId = useMemo(
    () => new Map(assignments.map((assignment) => [assignment.userId, assignment])),
    [assignments]
  );

  const activeUnits = useMemo(
    () => units.filter((unit) => unit.isActive),
    [units]
  );

  const loadOrganizationData = async () => {
    const [loadedUnits, loadedAssignments] = await Promise.all([
      getOrganizationUnits(),
      getOrganizationAssignments(),
    ]);

    setUnits(loadedUnits);
    setAssignments(loadedAssignments);
  };

  const refreshAll = async () => {
    try {
      setLoading(true);
      await Promise.all([refreshUsers(), loadOrganizationData()]);
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : 'تعذر تحميل بيانات الجهات والمستخدمين'
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshAll();
  }, []);

  const selectedFormUnit = useMemo(
    () => units.find((unit) => unit.id === userForm.organizationUnitId) || null,
    [units, userForm.organizationUnitId]
  );

  const availableRoles = selectedFormUnit
    ? ROLE_PRESETS[selectedFormUnit.unitType]
    : [];

  const assignedUsersCount = assignments.filter(
    (assignment) => assignment.organizationUnitId
  ).length;

  const filteredUsers = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();

    return users.filter((user) => {
      const assignment = assignmentByUserId.get(user.uid);
      const matchesUnit =
        unitFilter === 'all'
          ? true
          : unitFilter === 'unassigned'
            ? !assignment?.organizationUnitId
            : assignment?.organizationUnitId === unitFilter;

      if (!matchesUnit) return false;
      if (!normalizedSearch) return true;

      return [
        user.username,
        user.email,
        assignment?.organizationUnit?.nameAr,
        assignment?.organizationUnit?.code,
        assignment?.organizationRole,
      ]
        .filter(Boolean)
        .some((value) =>
          String(value).toLowerCase().includes(normalizedSearch)
        );
    });
  }, [
    users,
    assignmentByUserId,
    unitFilter,
    searchTerm,
  ]);

  const getRoleLabel = (assignment?: UserOrganizationAssignment) => {
    if (!assignment?.organizationRole) return 'غير محدد';
    const unitType = assignment.organizationUnit?.unitType;
    if (!unitType) return assignment.organizationRole;

    return (
      ROLE_PRESETS[unitType].find(
        (role) => role.key === assignment.organizationRole
      )?.label || assignment.organizationRole
    );
  };

  const openCreateUser = () => {
    const defaultUnit = unitFilter !== 'all' && unitFilter !== 'unassigned'
      ? activeUnits.find((unit) => unit.id === unitFilter)
      : activeUnits.find((unit) => unit.code === 'AST');
    const defaultRole = defaultUnit
      ? ROLE_PRESETS[defaultUnit.unitType][0]?.key || ''
      : '';

    setEditingUser(null);
    setUserForm({
      ...emptyUserForm(),
      organizationUnitId: defaultUnit?.id || '',
      organizationRole: defaultRole,
      permissions: permissionsForOrganizationRole(defaultRole, 'employee'),
    });
    setUserDialogOpen(true);
  };

  const openEditUser = (user: UserProfile) => {
    const assignment = assignmentByUserId.get(user.uid);

    setEditingUser(user);
    setUserForm({
      username: user.username,
      email: user.email,
      password: '',
      role: user.role,
      isActive: user.isActive,
      organizationUnitId: assignment?.organizationUnitId || '',
      organizationRole: assignment?.organizationRole || '',
      permissionScope:
        assignment?.permissionScope ||
        (user.role === 'admin' ? 'university' : 'department'),
      permissions: user.permissions,
    });
    setUserDialogOpen(true);
  };

  const handleUnitSelection = (organizationUnitId: string) => {
    const selected = units.find((unit) => unit.id === organizationUnitId);
    const firstRole = selected
      ? ROLE_PRESETS[selected.unitType][0]?.key || ''
      : '';

    setUserForm((current) => ({
      ...current,
      organizationUnitId,
      organizationRole: firstRole,
      permissions: permissionsForOrganizationRole(firstRole, current.role),
    }));
  };

  const handleOrganizationRoleSelection = (organizationRole: string) => {
    setUserForm((current) => ({
      ...current,
      organizationRole,
      permissions: permissionsForOrganizationRole(
        organizationRole,
        current.role
      ),
    }));
  };

  const handleAccountRoleSelection = (role: UserRole) => {
    setUserForm((current) => ({
      ...current,
      role,
      permissionScope: role === 'admin' ? 'university' : current.permissionScope,
      permissions: permissionsForOrganizationRole(
        current.organizationRole,
        role
      ),
    }));
  };

  const validateUserOrganization = () => {
    if (userForm.role === 'employee') {
      if (!userForm.organizationUnitId) {
        toast.error('يجب تحديد الإدارة أو الجهة التابعة للمستخدم');
        return false;
      }

      if (!userForm.organizationRole) {
        toast.error('يجب تحديد دور المستخدم داخل الإدارة');
        return false;
      }
    }

    return true;
  };

  const saveAssignmentForUser = async (userId: string) => {
    if (!userForm.organizationUnitId || !userForm.organizationRole) {
      await removeOrganizationAssignment(userId);
      return;
    }

    await saveOrganizationAssignment(userId, {
      organizationUnitId: userForm.organizationUnitId,
      organizationRole: userForm.organizationRole,
      permissionScope: userForm.permissionScope,
    });
  };

  const handleCreateUser = async () => {
    if (!validateUserOrganization()) return;

    if (userForm.password.length < 8) {
      toast.error('كلمة المرور المؤقتة يجب ألا تقل عن 8 أحرف');
      return;
    }

    setSavingUser(true);
    let createdUserId: string | null = null;

    try {
      const created = await apiJson<CreatedUserResponse>('/api/users', {
        method: 'POST',
        body: JSON.stringify({
          username: userForm.username.trim(),
          email: userForm.email.trim().toLowerCase(),
          password: userForm.password,
          role: userForm.role,
          permissions: userForm.permissions,
        }),
      });

      createdUserId = created.uid;
      await saveAssignmentForUser(created.uid);
      await refreshUsers();
      await loadOrganizationData();

      toast.success('تم إنشاء المستخدم وربطه بالجهة والدور بنجاح');
      setUserDialogOpen(false);
    } catch (error) {
      if (createdUserId) {
        await apiJson<void>(`/api/users/${createdUserId}`, {
          method: 'DELETE',
        }).catch(() => undefined);
      }

      toast.error(
        error instanceof Error ? error.message : 'تعذر إنشاء المستخدم'
      );
    } finally {
      setSavingUser(false);
    }
  };

  const handleUpdateUser = async () => {
    if (!editingUser || !validateUserOrganization()) return;

    setSavingUser(true);

    try {
      await updateEmployee(editingUser.uid, {
        username: userForm.username,
        email: userForm.email,
        role: userForm.role,
        isActive: userForm.isActive,
        permissions: userForm.permissions,
      });

      await saveAssignmentForUser(editingUser.uid);
      await loadOrganizationData();

      toast.success('تم تحديث بيانات المستخدم والجهة والدور والصلاحيات');
      setUserDialogOpen(false);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'تعذر تحديث المستخدم'
      );
    } finally {
      setSavingUser(false);
    }
  };

  const openCreateUnit = () => {
    setEditingUnit(null);
    setUnitForm(emptyUnitForm());
    setUnitDialogOpen(true);
  };

  const openEditUnit = (unit: OrganizationUnit) => {
    setEditingUnit(unit);
    setUnitForm({
      code: unit.code,
      nameAr: unit.nameAr,
      nameEn: unit.nameEn || '',
      unitType: unit.unitType,
      parentId: unit.parentId || null,
      isBeneficiary: unit.isBeneficiary,
      isActive: unit.isActive,
      responsibility: unit.responsibility || '',
    });
    setUnitDialogOpen(true);
  };

  const handleSaveUnit = async () => {
    if (!unitForm.code.trim() || !unitForm.nameAr.trim()) {
      toast.error('رمز الجهة واسمها العربي حقول إلزامية');
      return;
    }

    setSavingUnit(true);

    try {
      if (editingUnit) {
        await updateOrganizationUnit(editingUnit.id, unitForm);
        toast.success('تم تحديث بيانات الجهة');
      } else {
        await createOrganizationUnit(unitForm);
        toast.success('تمت إضافة الجهة بنجاح');
      }

      await loadOrganizationData();
      setUnitDialogOpen(false);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'تعذر حفظ بيانات الجهة'
      );
    } finally {
      setSavingUnit(false);
    }
  };

  const showUsersForUnit = (unitId: string) => {
    setUnitFilter(unitId);
    setActiveTab('users');
  };

  return (
    <div className="container mx-auto space-y-6 p-4 md:p-6">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div>
          <h1 className="text-3xl font-bold">إدارة الجهات والمستخدمين</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            ربط الإدارات المعنية بدورة الأصول بالمستخدمين والأدوار ونطاقات الصلاحية.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={refreshAll} disabled={loading}>
            <RefreshCw className={`me-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            تحديث
          </Button>
          <Button variant="outline" onClick={openCreateUnit}>
            <Building2 className="me-2 h-4 w-4" />
            إضافة جهة
          </Button>
          <Button onClick={openCreateUser}>
            <UserPlus className="me-2 h-4 w-4" />
            إضافة مستخدم
          </Button>
        </div>
      </div>

      <Alert>
        <ShieldCheck className="h-4 w-4" />
        <AlertTitle>الربط التنظيمي قبل دورة إجراءات الأصول</AlertTitle>
        <AlertDescription>
          كل مستخدم تشغيلي يربط بجهة محددة ودور وظيفي ونطاق صلاحية. الصلاحيات التفصيلية تبقى مستقلة وتدار لكل مستخدم لمنع تعارض المهام بين الاستلام والفحص والمطابقة والاعتماد.
        </AlertDescription>
      </Alert>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <SummaryCard
          icon={<Network className="h-5 w-5" />}
          title="الجهات المسجلة"
          value={units.length}
          description={`${activeUnits.length} جهة مفعلة`}
        />
        <SummaryCard
          icon={<Users className="h-5 w-5" />}
          title="المستخدمون"
          value={users.length}
          description={`${users.filter((user) => user.isActive).length} حساب نشط`}
        />
        <SummaryCard
          icon={<ShieldCheck className="h-5 w-5" />}
          title="مرتبطون بجهة"
          value={assignedUsersCount}
          description="لديهم إدارة ودور تشغيلي"
        />
        <SummaryCard
          icon={<UserPlus className="h-5 w-5" />}
          title="غير مرتبطين"
          value={Math.max(users.length - assignedUsersCount, 0)}
          description="يحتاجون إلى استكمال الربط التنظيمي"
        />
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-5">
        <TabsList className="h-auto flex-wrap">
          <TabsTrigger value="units">الإدارات والجهات</TabsTrigger>
          <TabsTrigger value="users">المستخدمون حسب الإدارة</TabsTrigger>
          <TabsTrigger value="roles">الأدوار والصلاحيات</TabsTrigger>
        </TabsList>

        <TabsContent value="units" className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-2 2xl:grid-cols-3">
            {units.map((unit) => (
              <Card key={unit.id} className={!unit.isActive ? 'opacity-70' : ''}>
                <CardHeader className="space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <CardTitle className="leading-7">{unit.nameAr}</CardTitle>
                      <CardDescription className="mt-1">
                        {UNIT_TYPE_LABELS[unit.unitType]}
                      </CardDescription>
                    </div>
                    <Badge variant={unit.isActive ? 'secondary' : 'outline'}>
                      {unit.code}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="min-h-14 text-sm leading-7 text-muted-foreground">
                    {unit.responsibility || 'لم تسجل مسؤولية الجهة بعد.'}
                  </p>

                  <div className="flex flex-wrap items-center gap-2 text-sm">
                    <Badge variant="outline">
                      <Users className="me-1 h-3.5 w-3.5" />
                      {unit.userCount} مستخدم
                    </Badge>
                    {unit.isBeneficiary && (
                      <Badge variant="outline">جهة مستفيدة</Badge>
                    )}
                    <Badge variant={unit.isActive ? 'secondary' : 'destructive'}>
                      {unit.isActive ? 'مفعلة' : 'غير مفعلة'}
                    </Badge>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => showUsersForUnit(unit.id)}
                    >
                      <Users className="me-2 h-4 w-4" />
                      مستخدمو الجهة
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => openEditUnit(unit)}
                    >
                      <Edit3 className="me-2 h-4 w-4" />
                      تعديل
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="users" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>مستخدمو الجهات</CardTitle>
              <CardDescription>
                يمكن تصفية المستخدمين حسب الإدارة ثم تعديل الدور ونطاق الصلاحيات والمصفوفة التفصيلية.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-3 lg:grid-cols-[1fr_260px_auto]">
                <div className="relative">
                  <Search className="absolute end-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={searchTerm}
                    onChange={(event) => setSearchTerm(event.target.value)}
                    placeholder="بحث بالاسم أو البريد أو الإدارة أو الدور"
                    className="pe-10"
                  />
                </div>

                <NativeSelect
                  value={unitFilter}
                  onChange={(event) => setUnitFilter(event.target.value)}
                >
                  <option value="all">جميع الجهات</option>
                  <option value="unassigned">غير مرتبط بجهة</option>
                  {units.map((unit) => (
                    <option key={unit.id} value={unit.id}>
                      {unit.nameAr}
                    </option>
                  ))}
                </NativeSelect>

                <Button onClick={openCreateUser}>
                  <Plus className="me-2 h-4 w-4" />
                  مستخدم جديد
                </Button>
              </div>

              <div className="overflow-x-auto rounded-xl border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>المستخدم</TableHead>
                      <TableHead>الإدارة/الجهة</TableHead>
                      <TableHead>الدور داخل الجهة</TableHead>
                      <TableHead>نطاق الصلاحية</TableHead>
                      <TableHead>الحساب</TableHead>
                      <TableHead className="text-center">إجراء</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredUsers.map((user) => {
                      const assignment = assignmentByUserId.get(user.uid);

                      return (
                        <TableRow key={user.uid}>
                          <TableCell>
                            <div className="font-medium">{user.username}</div>
                            <div className="text-xs text-muted-foreground" dir="ltr">
                              {user.email}
                            </div>
                          </TableCell>
                          <TableCell>
                            {assignment?.organizationUnit ? (
                              <div>
                                <div className="font-medium">
                                  {assignment.organizationUnit.nameAr}
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  {assignment.organizationUnit.code}
                                </div>
                              </div>
                            ) : (
                              <Badge variant="outline">غير مرتبط</Badge>
                            )}
                          </TableCell>
                          <TableCell>{getRoleLabel(assignment)}</TableCell>
                          <TableCell>
                            {assignment
                              ? SCOPE_LABELS[assignment.permissionScope]
                              : user.role === 'admin'
                                ? 'الجامعة'
                                : 'غير محدد'}
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-wrap gap-2">
                              <Badge variant={user.isActive ? 'secondary' : 'destructive'}>
                                {user.isActive ? 'نشط' : 'غير نشط'}
                              </Badge>
                              {user.role === 'admin' && <Badge>مسؤول</Badge>}
                            </div>
                          </TableCell>
                          <TableCell className="text-center">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => openEditUser(user)}
                            >
                              <Edit3 className="me-2 h-4 w-4" />
                              إدارة
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}

                    {!filteredUsers.length && (
                      <TableRow>
                        <TableCell colSpan={6} className="py-10 text-center text-muted-foreground">
                          لا توجد حسابات مطابقة للتصفية الحالية.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="roles" className="space-y-4">
          <Alert>
            <ShieldCheck className="h-4 w-4" />
            <AlertTitle>الأدوار لا تستبدل الصلاحيات</AlertTitle>
            <AlertDescription>
              الدور يحدد وظيفة المستخدم داخل الإدارة، بينما مصفوفة الصلاحيات تحدد ما يستطيع تنفيذه فعليًا داخل المنصة. وسيتم لاحقًا ربط هذه الأدوار بمراحل Workflow للأصول.
            </AlertDescription>
          </Alert>

          <div className="grid gap-4 lg:grid-cols-2">
            {units.map((unit) => (
              <Card key={`roles-${unit.id}`}>
                <CardHeader>
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <CardTitle className="text-lg">{unit.nameAr}</CardTitle>
                      <CardDescription>{unit.code}</CardDescription>
                    </div>
                    <Badge variant="outline">
                      {ROLE_PRESETS[unit.unitType].length} أدوار
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {ROLE_PRESETS[unit.unitType].map((role) => (
                    <div key={role.key} className="rounded-xl border p-3">
                      <div className="font-semibold">{role.label}</div>
                      <div className="mt-1 text-sm leading-6 text-muted-foreground">
                        {role.description}
                      </div>
                      <div className="mt-2 font-mono text-[11px] text-muted-foreground" dir="ltr">
                        {role.key}
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      <Dialog open={userDialogOpen} onOpenChange={setUserDialogOpen}>
        <DialogContent className="max-h-[92dvh] max-w-6xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingUser ? 'إدارة المستخدم والجهة والصلاحيات' : 'إضافة مستخدم جديد'}
            </DialogTitle>
            <DialogDescription>
              اربط الحساب بالإدارة والدور ونطاق الصلاحية ثم حدد صلاحيات الوصول التفصيلية.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>اسم المستخدم *</Label>
              <Input
                value={userForm.username}
                onChange={(event) =>
                  setUserForm((current) => ({
                    ...current,
                    username: event.target.value,
                  }))
                }
              />
            </div>

            <div className="space-y-2">
              <Label>البريد الإلكتروني *</Label>
              <Input
                type="email"
                dir="ltr"
                value={userForm.email}
                onChange={(event) =>
                  setUserForm((current) => ({
                    ...current,
                    email: event.target.value,
                  }))
                }
              />
            </div>

            {!editingUser && (
              <div className="space-y-2">
                <Label>كلمة المرور المؤقتة *</Label>
                <Input
                  type="password"
                  minLength={8}
                  value={userForm.password}
                  onChange={(event) =>
                    setUserForm((current) => ({
                      ...current,
                      password: event.target.value,
                    }))
                  }
                />
              </div>
            )}

            <div className="space-y-2">
              <Label>نوع الحساب *</Label>
              <NativeSelect
                value={userForm.role}
                onChange={(event) =>
                  handleAccountRoleSelection(event.target.value as UserRole)
                }
              >
                <option value="employee">مستخدم تشغيلي</option>
                <option value="admin">مسؤول النظام</option>
              </NativeSelect>
            </div>

            <div className="space-y-2">
              <Label>الإدارة / الجهة {userForm.role === 'employee' ? '*' : ''}</Label>
              <NativeSelect
                value={userForm.organizationUnitId}
                onChange={(event) => handleUnitSelection(event.target.value)}
              >
                <option value="">بدون جهة</option>
                {activeUnits.map((unit) => (
                  <option key={unit.id} value={unit.id}>
                    {unit.nameAr} ({unit.code})
                  </option>
                ))}
              </NativeSelect>
            </div>

            <div className="space-y-2">
              <Label>الدور داخل الجهة {userForm.role === 'employee' ? '*' : ''}</Label>
              <NativeSelect
                value={userForm.organizationRole}
                onChange={(event) =>
                  handleOrganizationRoleSelection(event.target.value)
                }
                disabled={!selectedFormUnit}
              >
                <option value="">اختر الدور</option>
                {availableRoles.map((role) => (
                  <option key={role.key} value={role.key}>
                    {role.label}
                  </option>
                ))}
              </NativeSelect>
            </div>

            <div className="space-y-2">
              <Label>نطاق الصلاحية *</Label>
              <NativeSelect
                value={userForm.permissionScope}
                onChange={(event) =>
                  setUserForm((current) => ({
                    ...current,
                    permissionScope: event.target.value as PermissionScope,
                  }))
                }
              >
                <option value="personal">شخصي - أصول المستخدم فقط</option>
                <option value="department">الجهة - أصول إدارته فقط</option>
                <option value="sector">القطاع - الجهات التابعة للقطاع</option>
                <option value="university">الجامعة - جميع الأصول</option>
              </NativeSelect>
            </div>

            {editingUser && (
              <div className="space-y-2">
                <Label>حالة الحساب</Label>
                <NativeSelect
                  value={userForm.isActive ? 'active' : 'inactive'}
                  onChange={(event) =>
                    setUserForm((current) => ({
                      ...current,
                      isActive: event.target.value === 'active',
                    }))
                  }
                >
                  <option value="active">نشط</option>
                  <option value="inactive">معطل</option>
                </NativeSelect>
              </div>
            )}
          </div>

          {userForm.role === 'employee' && (
            <div className="mt-2">
              <PermissionMatrix
                value={userForm.permissions}
                onChange={(permissions) =>
                  setUserForm((current) => ({ ...current, permissions }))
                }
                dialogMode
              />
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setUserDialogOpen(false)}>
              إلغاء
            </Button>
            <Button
              onClick={editingUser ? handleUpdateUser : handleCreateUser}
              disabled={savingUser}
            >
              {savingUser ? 'جارٍ الحفظ...' : editingUser ? 'حفظ التعديلات' : 'إنشاء المستخدم'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={unitDialogOpen} onOpenChange={setUnitDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingUnit ? 'تعديل الجهة' : 'إضافة جهة أو إدارة'}</DialogTitle>
            <DialogDescription>
              يمكن إضافة الكليات والعمادات والإدارات المستفيدة وربطها بتصنيف الجهات المستفيدة.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>رمز الجهة *</Label>
              <Input
                dir="ltr"
                value={unitForm.code}
                onChange={(event) =>
                  setUnitForm((current) => ({
                    ...current,
                    code: event.target.value.toUpperCase(),
                  }))
                }
                placeholder="ENG"
              />
            </div>
            <div className="space-y-2">
              <Label>اسم الجهة بالعربي *</Label>
              <Input
                value={unitForm.nameAr}
                onChange={(event) =>
                  setUnitForm((current) => ({
                    ...current,
                    nameAr: event.target.value,
                  }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label>الاسم بالإنجليزية</Label>
              <Input
                dir="ltr"
                value={unitForm.nameEn || ''}
                onChange={(event) =>
                  setUnitForm((current) => ({
                    ...current,
                    nameEn: event.target.value,
                  }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label>نوع الجهة</Label>
              <NativeSelect
                value={unitForm.unitType}
                onChange={(event) =>
                  setUnitForm((current) => ({
                    ...current,
                    unitType: event.target.value as OrganizationUnitType,
                  }))
                }
              >
                {Object.entries(UNIT_TYPE_LABELS).map(([key, label]) => (
                  <option key={key} value={key}>
                    {label}
                  </option>
                ))}
              </NativeSelect>
            </div>
            <div className="space-y-2">
              <Label>الجهة الأعلى</Label>
              <NativeSelect
                value={unitForm.parentId || ''}
                onChange={(event) =>
                  setUnitForm((current) => ({
                    ...current,
                    parentId: event.target.value || null,
                  }))
                }
              >
                <option value="">بدون جهة أعلى</option>
                {units
                  .filter((unit) => unit.id !== editingUnit?.id)
                  .map((unit) => (
                    <option key={unit.id} value={unit.id}>
                      {unit.nameAr}
                    </option>
                  ))}
              </NativeSelect>
            </div>
            <div className="space-y-2">
              <Label>الحالة</Label>
              <NativeSelect
                value={unitForm.isActive ? 'active' : 'inactive'}
                onChange={(event) =>
                  setUnitForm((current) => ({
                    ...current,
                    isActive: event.target.value === 'active',
                  }))
                }
              >
                <option value="active">مفعلة</option>
                <option value="inactive">غير مفعلة</option>
              </NativeSelect>
            </div>
          </div>

          <div className="space-y-2">
            <Label>المسؤولية الرئيسية</Label>
            <textarea
              className="min-h-24 w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
              value={unitForm.responsibility || ''}
              onChange={(event) =>
                setUnitForm((current) => ({
                  ...current,
                  responsibility: event.target.value,
                }))
              }
            />
          </div>

          <div className="flex items-center gap-2">
            <input
              id="beneficiary-unit"
              type="checkbox"
              checked={unitForm.isBeneficiary}
              onChange={(event) =>
                setUnitForm((current) => ({
                  ...current,
                  isBeneficiary: event.target.checked,
                }))
              }
            />
            <Label htmlFor="beneficiary-unit">هذه جهة مستفيدة من الأصول</Label>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setUnitDialogOpen(false)}>
              إلغاء
            </Button>
            <Button onClick={handleSaveUnit} disabled={savingUnit}>
              {savingUnit ? 'جارٍ الحفظ...' : 'حفظ الجهة'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

const SummaryCard: React.FC<{
  icon: React.ReactNode;
  title: string;
  value: number;
  description: string;
}> = ({ icon, title, value, description }) => (
  <Card>
    <CardContent className="flex items-center justify-between gap-4 p-5">
      <div>
        <div className="text-sm text-muted-foreground">{title}</div>
        <div className="mt-1 text-3xl font-bold">{value}</div>
        <div className="mt-1 text-xs text-muted-foreground">{description}</div>
      </div>
      <div className="grid h-11 w-11 place-items-center rounded-xl bg-primary/10 text-primary">
        {icon}
      </div>
    </CardContent>
  </Card>
);
