import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { usePermissions } from '../../context/PermissionsContext';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router';
import { Shield, Users, Database, Settings, AlertTriangle, UserPlus } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '../components/ui/alert';
import { Badge } from '../components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
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
import { useData } from '../../context/DataContext';
import { toast } from 'sonner';
import type { UserRole } from '../../types/permissions';

export const AdminDashboardPage: React.FC = () => {
  const { t } = useTranslation();
  const { isAdmin } = usePermissions();
  const { createEmployee, users, refreshUsers } = useAuth();
  const { getStatistics } = useData();
  const navigate = useNavigate();
  const stats = getStatistics();

  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<UserRole>('employee');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const sortedUsers = useMemo(() => {
    return [...users].sort((a, b) => {
      if (a.role === b.role) return a.username.localeCompare(b.username, 'ar');
      return a.role === 'admin' ? -1 : 1;
    });
  }, [users]);

  if (!isAdmin) {
    return (
      <div className="container mx-auto p-6">
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>{t('admin.unauthorized')}</AlertTitle>
          <AlertDescription>{t('admin.unauthorizedMessage')}</AlertDescription>
        </Alert>
        <div className="mt-4">
          <Button onClick={() => navigate('/')}>{t('admin.backToHome')}</Button>
        </div>
      </div>
    );
  }

  const handleResetDemoData = () => {
    if (confirm(t('admin.resetDemoDataConfirm'))) {
      localStorage.clear();
      toast.success(t('admin.resetSuccess'));
      window.location.reload();
    }
  };

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
    } catch (error: any) {
      toast.error(error?.message || 'تعذر إنشاء حساب المستخدم');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getRoleBadge = (userRole: UserRole) => {
    if (userRole === 'admin') {
      return <Badge className="gap-1"><Shield className="h-3 w-3" /> مسؤول</Badge>;
    }

    return <Badge variant="secondary">مستخدم محدود</Badge>;
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">{t('admin.dashboard')}</h1>
          <p className="text-muted-foreground">{t('admin.systemManagement')}</p>
        </div>
        <Badge variant="default" className="gap-2">
          <Shield className="h-4 w-4" />
          {t('admin.administrator')}
        </Badge>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('admin.totalRecords')}</CardTitle>
            <Database className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalRecords}</div>
            <p className="text-xs text-muted-foreground">{t('admin.allSections')}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('admin.deeds')}</CardTitle>
            <Database className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalDeeds}</div>
            <p className="text-xs text-muted-foreground">{t('admin.registered')}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('admin.lands')}</CardTitle>
            <Database className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats.totalAllocatedLands +
                stats.totalDeliveredLands +
                stats.totalLeasedLandsOut +
                stats.totalLeasedLandsIn}
            </div>
            <p className="text-xs text-muted-foreground">{t('admin.registered')}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('admin.buildings')}</CardTitle>
            <Database className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats.totalLeasedBuildingsOut + stats.totalLeasedBuildingsIn}
            </div>
            <p className="text-xs text-muted-foreground">{t('admin.registered')}</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="users" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">{t('admin.overview')}</TabsTrigger>
          <TabsTrigger value="users">إدارة المستخدمين</TabsTrigger>
          <TabsTrigger value="settings">{t('admin.settings')}</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>{t('admin.detailedStatistics')}</CardTitle>
              <CardDescription>{t('admin.statisticsDescription')}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex justify-between items-center border-b pb-2">
                  <span className="font-medium">{t('admin.allocatedLands')}</span>
                  <Badge>{stats.totalAllocatedLands}</Badge>
                </div>
                <div className="flex justify-between items-center border-b pb-2">
                  <span className="font-medium">{t('admin.deliveredLands')}</span>
                  <Badge>{stats.totalDeliveredLands}</Badge>
                </div>
                <div className="flex justify-between items-center border-b pb-2">
                  <span className="font-medium">{t('admin.leasedLandsOut')}</span>
                  <Badge>{stats.totalLeasedLandsOut}</Badge>
                </div>
                <div className="flex justify-between items-center border-b pb-2">
                  <span className="font-medium">{t('admin.leasedLandsIn')}</span>
                  <Badge>{stats.totalLeasedLandsIn}</Badge>
                </div>
                <div className="flex justify-between items-center border-b pb-2">
                  <span className="font-medium">{t('admin.leasedBuildingsOut')}</span>
                  <Badge>{stats.totalLeasedBuildingsOut}</Badge>
                </div>
                <div className="flex justify-between items-center border-b pb-2">
                  <span className="font-medium">{t('admin.leasedBuildingsIn')}</span>
                  <Badge>{stats.totalLeasedBuildingsIn}</Badge>
                </div>
                <div className="flex justify-between items-center pt-2">
                  <span className="font-bold">{t('admin.totalArea')}</span>
                  <Badge variant="default">
                    {stats.totalArea.toLocaleString()} {t('deed.sqm')}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="users" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserPlus className="h-5 w-5" />
                إضافة مستخدم جديد
              </CardTitle>
              <CardDescription>
                يستطيع المسؤول إنشاء حسابات بصلاحيات كاملة أو محدودة.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleCreateUser} className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password">كلمة المرور *</Label>
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder="كلمة مرور مؤقتة"
                    minLength={6}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="role">نوع الصلاحية *</Label>
                  <NativeSelect
                    id="role"
                    value={role}
                    onChange={(event) => setRole(event.target.value as UserRole)}
                  >
                    <option value="employee">مستخدم محدود - عرض فقط</option>
                    <option value="admin">مسؤول - صلاحيات كاملة</option>
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
                قائمة بالحسابات المسجلة ونوع صلاحية كل حساب.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>اسم المستخدم</TableHead>
                      <TableHead>البريد الإلكتروني</TableHead>
                      <TableHead>الصلاحية</TableHead>
                      <TableHead>وصف الصلاحية</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sortedUsers.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                          لا توجد حسابات مسجلة.
                        </TableCell>
                      </TableRow>
                    ) : (
                      sortedUsers.map((user) => (
                        <TableRow key={user.uid}>
                          <TableCell className="font-medium">{user.username}</TableCell>
                          <TableCell dir="ltr" className="text-left">{user.email}</TableCell>
                          <TableCell>{getRoleBadge(user.role)}</TableCell>
                          <TableCell className="text-muted-foreground">
                            {user.role === 'admin'
                              ? 'صلاحيات كاملة: إضافة، تعديل، حذف، عرض، وإدارة النظام.'
                              : 'صلاحيات محدودة: عرض وطباعة فقط بدون إضافة أو تعديل أو حذف.'}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>{t('admin.systemSettings')}</CardTitle>
              <CardDescription>{t('admin.systemSettingsDescription')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <h3 className="font-medium">{t('admin.demoData')}</h3>
                <p className="text-sm text-muted-foreground">{t('admin.demoDataDescription')}</p>
                <Button variant="destructive" onClick={handleResetDemoData}>
                  <Database className="ml-2 h-4 w-4" />
                  {t('admin.resetDemoData')}
                </Button>
              </div>

              <Alert variant="default">
                <Settings className="h-4 w-4" />
                <AlertTitle>{t('admin.note')}</AlertTitle>
                <AlertDescription>{t('admin.demoModeNote')}</AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};
