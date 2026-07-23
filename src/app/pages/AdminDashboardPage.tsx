import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { usePermissions } from '../../context/PermissionsContext';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router';
import {
  AlertTriangle,
  Database,
  Edit,
  KeyRound,
  Shield,
  Trash2,
  UserPlus,
  Users,
} from 'lucide-react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '../components/ui/card';
import { Button } from '../components/ui/button';
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from '../components/ui/alert';
import { Badge } from '../components/ui/badge';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '../components/ui/tabs';
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../components/ui/alert-dialog';
import { useData } from '../../context/DataContext';
import { toast } from 'sonner';
import type { UserProfile, UserRole } from '../../types/permissions';

type EditForm = {
  username: string;
  email: string;
  role: UserRole;
  isActive: boolean;
};

const emptyEditForm: EditForm = {
  username: '',
  email: '',
  role: 'employee',
  isActive: true,
};

export const AdminDashboardPage: React.FC = () => {
  const { t } = useTranslation();
  const { isAdmin } = usePermissions();
  const {
    currentUser,
    createEmployee,
    deleteEmployee,
    refreshUsers,
    resetEmployeePassword,
    updateEmployee,
    users,
  } = useAuth();
  const { getStatistics } = useData();
  const navigate = useNavigate();
  const stats = getStatistics();

  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<UserRole>('employee');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [editingUser, setEditingUser] = useState<UserProfile | null>(null);
  const [editForm, setEditForm] = useState<EditForm>(emptyEditForm);
  const [editOpen, setEditOpen] = useState(false);
  const [editSaving, setEditSaving] = useState(false);

  const [passwordUser, setPasswordUser] = useState<UserProfile | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [passwordOpen, setPasswordOpen] = useState(false);
  const [passwordSaving, setPasswordSaving] = useState(false);

  const [deleteUser, setDeleteUser] = useState<UserProfile | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteSaving, setDeleteSaving] = useState(false);

  const sortedUsers = useMemo(() => {
    return [...users].sort((a, b) => {
      if (a.role === b.role) {
        return a.username.localeCompare(b.username, 'ar');
      }

      return a.role === 'admin' ? -1 : 1;
    });
  }, [users]);

  if (!isAdmin) {
    return (
      <div className="container mx-auto p-6">
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>{t('admin.unauthorized')}</AlertTitle>
          <AlertDescription>
            {t('admin.unauthorizedMessage')}
          </AlertDescription>
        </Alert>

        <div className="mt-4">
          <Button onClick={() => navigate('/')}>
            {t('admin.backToHome')}
          </Button>
        </div>
      </div>
    );
  }

  const handleCreateUser = async (event: React.FormEvent) => {
    event.preventDefault();

    try {
      setIsSubmitting(true);
      await createEmployee(email, password, username, role);
      await refreshUsers();

      toast.success('تم إنشاء حساب المستخدم بنجاح');
      setUsername('');
      setEmail('');
      setPassword('');
      setRole('employee');
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : 'تعذر إنشاء حساب المستخدم'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const openEditUser = (user: UserProfile) => {
    setEditingUser(user);
    setEditForm({
      username: user.username,
      email: user.email,
      role: user.role,
      isActive: user.isActive,
    });
    setEditOpen(true);
  };

  const saveEditedUser = async () => {
    if (!editingUser) return;

    try {
      setEditSaving(true);
      await updateEmployee(editingUser.uid, editForm);
      toast.success('تم تحديث بيانات المستخدم وصلاحياته');
      setEditOpen(false);
      setEditingUser(null);
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : 'تعذر تحديث المستخدم'
      );
    } finally {
      setEditSaving(false);
    }
  };

  const openPasswordDialog = (user: UserProfile) => {
    setPasswordUser(user);
    setNewPassword('');
    setPasswordOpen(true);
  };

  const saveNewPassword = async () => {
    if (!passwordUser) return;

    if (newPassword.length < 8) {
      toast.error('كلمة المرور يجب ألا تقل عن 8 أحرف');
      return;
    }

    try {
      setPasswordSaving(true);
      await resetEmployeePassword(passwordUser.uid, newPassword);
      toast.success('تم تغيير كلمة مرور المستخدم');
      setPasswordOpen(false);
      setPasswordUser(null);
      setNewPassword('');
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : 'تعذر تغيير كلمة المرور'
      );
    } finally {
      setPasswordSaving(false);
    }
  };

  const confirmDeleteUser = async () => {
    if (!deleteUser) return;

    try {
      setDeleteSaving(true);
      await deleteEmployee(deleteUser.uid);
      toast.success('تم حذف المستخدم');
      setDeleteOpen(false);
      setDeleteUser(null);
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : 'تعذر حذف المستخدم'
      );
    } finally {
      setDeleteSaving(false);
    }
  };

  const getRoleBadge = (userRole: UserRole) => {
    if (userRole === 'admin') {
      return (
        <Badge className="gap-1">
          <Shield className="h-3 w-3" />
          مسؤول
        </Badge>
      );
    }

    return <Badge variant="secondary">مستخدم للعرض فقط</Badge>;
  };

  return (
    <div className="container mx-auto space-y-6 p-4 md:p-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold">{t('admin.dashboard')}</h1>
          <p className="text-muted-foreground">
            إدارة المستخدمين والأدوار وصلاحيات الوصول
          </p>
        </div>

        <Badge variant="default" className="w-fit gap-2">
          <Shield className="h-4 w-4" />
          المسؤول
        </Badge>
      </div>

      <Alert>
        <Shield className="h-4 w-4" />
        <AlertTitle>سياسة الصلاحيات المعتمدة</AlertTitle>
        <AlertDescription>
          المسؤول يملك الإضافة والتعديل والحذف وإدارة الأرشفة والمرفقات
          والمستخدمين. المستخدم العادي يستطيع العرض والبحث والطباعة فقط.
        </AlertDescription>
      </Alert>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="إجمالي السجلات"
          value={stats.totalRecords}
          description="في جميع الأقسام"
        />
        <StatCard
          title="الصكوك"
          value={stats.totalDeeds}
          description="سجل"
        />
        <StatCard
          title="الأراضي"
          value={
            stats.totalAllocatedLands +
            stats.totalDeliveredLands +
            stats.totalLeasedLandsOut +
            stats.totalLeasedLandsIn
          }
          description="سجل"
        />
        <StatCard
          title="المباني"
          value={
            stats.totalLeasedBuildingsOut +
            stats.totalLeasedBuildingsIn
          }
          description="سجل"
        />
      </div>

      <Tabs defaultValue="users" className="space-y-4">
        <TabsList>
          <TabsTrigger value="users">إدارة المستخدمين</TabsTrigger>
          <TabsTrigger value="permissions">ملخص الصلاحيات</TabsTrigger>
        </TabsList>

        <TabsContent value="users" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserPlus className="h-5 w-5" />
                إضافة مستخدم جديد
              </CardTitle>
              <CardDescription>
                أنشئ حساب مسؤول أو مستخدم عادي للعرض فقط.
              </CardDescription>
            </CardHeader>

            <CardContent>
              <form
                onSubmit={handleCreateUser}
                className="grid grid-cols-1 gap-4 md:grid-cols-2"
              >
                <div className="space-y-2">
                  <Label htmlFor="username">اسم المستخدم *</Label>
                  <Input
                    id="username"
                    value={username}
                    onChange={(event) => setUsername(event.target.value)}
                    placeholder="مثال: محمد أحمد"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">البريد الإلكتروني *</Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="user@university.edu"
                    required
                    dir="ltr"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password">كلمة المرور المؤقتة *</Label>
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder="8 أحرف على الأقل"
                    minLength={8}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="role">الدور *</Label>
                  <NativeSelect
                    id="role"
                    value={role}
                    onChange={(event) =>
                      setRole(event.target.value as UserRole)
                    }
                  >
                    <option value="employee">
                      مستخدم عادي - عرض وطباعة فقط
                    </option>
                    <option value="admin">
                      مسؤول - جميع الصلاحيات
                    </option>
                  </NativeSelect>
                </div>

                <div className="md:col-span-2 flex justify-end">
                  <Button type="submit" disabled={isSubmitting}>
                    <UserPlus className="ml-2 h-4 w-4" />
                    {isSubmitting ? 'جاري الإضافة...' : 'إضافة المستخدم'}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                المستخدمون المسجلون
              </CardTitle>
              <CardDescription>
                تعديل البيانات والدور والحالة وكلمة المرور أو حذف الحساب.
              </CardDescription>
            </CardHeader>

            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>اسم المستخدم</TableHead>
                      <TableHead>البريد الإلكتروني</TableHead>
                      <TableHead>الدور</TableHead>
                      <TableHead>الحالة</TableHead>
                      <TableHead>آخر دخول</TableHead>
                      <TableHead className="text-left">الإجراءات</TableHead>
                    </TableRow>
                  </TableHeader>

                  <TableBody>
                    {sortedUsers.length === 0 ? (
                      <TableRow>
                        <TableCell
                          colSpan={6}
                          className="py-8 text-center text-muted-foreground"
                        >
                          لا توجد حسابات مسجلة.
                        </TableCell>
                      </TableRow>
                    ) : (
                      sortedUsers.map((user) => {
                        const isCurrentUser =
                          currentUser?.uid === user.uid;

                        return (
                          <TableRow key={user.uid}>
                            <TableCell className="font-medium">
                              <div className="flex items-center gap-2">
                                {user.username}
                                {isCurrentUser && (
                                  <Badge variant="outline">الحساب الحالي</Badge>
                                )}
                              </div>
                            </TableCell>

                            <TableCell dir="ltr" className="text-left">
                              {user.email}
                            </TableCell>

                            <TableCell>{getRoleBadge(user.role)}</TableCell>

                            <TableCell>
                              {user.isActive ? (
                                <Badge variant="secondary">نشط</Badge>
                              ) : (
                                <Badge variant="destructive">معطل</Badge>
                              )}
                            </TableCell>

                            <TableCell>
                              {user.lastLoginAt
                                ? user.lastLoginAt.toLocaleString('ar-SA')
                                : 'لم يسجل الدخول'}
                            </TableCell>

                            <TableCell>
                              <div className="flex justify-end gap-1">
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  title="تعديل البيانات والصلاحية"
                                  onClick={() => openEditUser(user)}
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>

                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  title="تغيير كلمة المرور"
                                  onClick={() => openPasswordDialog(user)}
                                >
                                  <KeyRound className="h-4 w-4" />
                                </Button>

                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  title="حذف المستخدم"
                                  className="text-destructive"
                                  disabled={isCurrentUser}
                                  onClick={() => {
                                    setDeleteUser(user);
                                    setDeleteOpen(true);
                                  }}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="permissions">
          <Card>
            <CardHeader>
              <CardTitle>مصفوفة الصلاحيات</CardTitle>
              <CardDescription>
                الصلاحيات موحدة حسب الدور لضمان الوضوح وسلامة البيانات.
              </CardDescription>
            </CardHeader>

            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>القسم</TableHead>
                      <TableHead>المسؤول</TableHead>
                      <TableHead>المستخدم العادي</TableHead>
                    </TableRow>
                  </TableHeader>

                  <TableBody>
                    {[
                      'الصكوك',
                      'الأراضي المخصصة',
                      'الأراضي المستلمة',
                      'الأراضي المؤجرة',
                      'الأراضي المستأجرة',
                      'المباني المؤجرة',
                      'المباني المستأجرة',
                      'الأرشفة',
                    ].map((module) => (
                      <TableRow key={module}>
                        <TableCell className="font-medium">
                          {module}
                        </TableCell>
                        <TableCell>
                          إضافة، عرض، تعديل، حذف، طباعة
                        </TableCell>
                        <TableCell>
                          عرض وطباعة فقط
                        </TableCell>
                      </TableRow>
                    ))}

                    <TableRow>
                      <TableCell className="font-medium">
                        إدارة المستخدمين
                      </TableCell>
                      <TableCell>
                        إضافة، تعديل، تغيير دور، تعطيل، حذف، تغيير كلمة مرور
                      </TableCell>
                      <TableCell>لا يمكن الوصول</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>تعديل بيانات المستخدم</DialogTitle>
            <DialogDescription>
              حدّث الاسم والبريد والدور وحالة الحساب.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-2">
            <div className="space-y-2">
              <Label>اسم المستخدم</Label>
              <Input
                value={editForm.username}
                onChange={(event) =>
                  setEditForm((current) => ({
                    ...current,
                    username: event.target.value,
                  }))
                }
              />
            </div>

            <div className="space-y-2">
              <Label>البريد الإلكتروني</Label>
              <Input
                type="email"
                dir="ltr"
                value={editForm.email}
                onChange={(event) =>
                  setEditForm((current) => ({
                    ...current,
                    email: event.target.value,
                  }))
                }
              />
            </div>

            <div className="space-y-2">
              <Label>الدور</Label>
              <NativeSelect
                value={editForm.role}
                onChange={(event) =>
                  setEditForm((current) => ({
                    ...current,
                    role: event.target.value as UserRole,
                  }))
                }
              >
                <option value="employee">مستخدم عادي - عرض فقط</option>
                <option value="admin">مسؤول - صلاحيات كاملة</option>
              </NativeSelect>
            </div>

            <div className="space-y-2">
              <Label>حالة الحساب</Label>
              <NativeSelect
                value={editForm.isActive ? 'active' : 'inactive'}
                onChange={(event) =>
                  setEditForm((current) => ({
                    ...current,
                    isActive: event.target.value === 'active',
                  }))
                }
              >
                <option value="active">نشط</option>
                <option value="inactive">معطل</option>
              </NativeSelect>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>
              إلغاء
            </Button>
            <Button onClick={saveEditedUser} disabled={editSaving}>
              {editSaving ? 'جاري الحفظ...' : 'حفظ التعديلات'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={passwordOpen} onOpenChange={setPasswordOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>تغيير كلمة المرور</DialogTitle>
            <DialogDescription>
              سيتم تعيين كلمة مرور جديدة للمستخدم: {passwordUser?.username}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2 py-2">
            <Label>كلمة المرور الجديدة</Label>
            <Input
              type="password"
              value={newPassword}
              minLength={8}
              onChange={(event) => setNewPassword(event.target.value)}
              placeholder="8 أحرف على الأقل"
            />
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setPasswordOpen(false)}
            >
              إلغاء
            </Button>
            <Button onClick={saveNewPassword} disabled={passwordSaving}>
              {passwordSaving ? 'جاري التغيير...' : 'تغيير كلمة المرور'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>حذف المستخدم</AlertDialogTitle>
            <AlertDialogDescription>
              سيتم حذف حساب {deleteUser?.username} نهائيًا. لا يمكن حذف
              الحساب الحالي أو آخر مسؤول نشط.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <AlertDialogFooter>
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDeleteUser}
              disabled={deleteSaving}
              className="bg-destructive text-destructive-foreground"
            >
              {deleteSaving ? 'جاري الحذف...' : 'حذف المستخدم'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

const StatCard: React.FC<{
  title: string;
  value: number;
  description: string;
}> = ({ title, value, description }) => (
  <Card>
    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
      <CardTitle className="text-sm font-medium">{title}</CardTitle>
      <Database className="h-4 w-4 text-muted-foreground" />
    </CardHeader>
    <CardContent>
      <div className="text-2xl font-bold">{value}</div>
      <p className="text-xs text-muted-foreground">{description}</p>
    </CardContent>
  </Card>
);
