import React, { useEffect, useMemo, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  CalendarDays,
  Download,
  Eye,
  Filter,
  LogIn,
  Plus,
  RefreshCcw,
  Search,
  ShieldCheck,
  Trash2,
  UserRound,
  Users,
  Wrench,
} from 'lucide-react';
import { apiJson } from '../../lib/http';
import type {
  AuditFiltersResponse,
  AuditListResponse,
  AuditLogItem,
  AuditStats,
} from '../../types/audit';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { NativeSelect } from '../components/ui/native-select';
import { Badge } from '../components/ui/badge';
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
  DialogHeader,
  DialogTitle,
} from '../components/ui/dialog';
import { Separator } from '../components/ui/separator';
import { toast } from 'sonner';

const EMPTY_STATS: AuditStats = {
  total: 0,
  today: 0,
  create: 0,
  update: 0,
  delete: 0,
  failed: 0,
  failedLogins: 0,
  activeUsersToday: 0,
};

const actionLabels: Record<string, string> = {
  login: 'تسجيل دخول',
  logout: 'تسجيل خروج',
  create: 'إضافة',
  update: 'تعديل',
  delete: 'حذف',
  upload: 'رفع ملف',
  view: 'عرض',
  download: 'تنزيل',
  print: 'طباعة',
  export: 'تصدير',
};

const moduleLabels: Record<string, string> = {
  auth: 'الدخول والجلسات',
  users: 'المستخدمون',
  deeds: 'الصكوك',
  records: 'الأراضي والمباني',
  attachments: 'المرفقات',
  uploads: 'رفع الملفات',
  archive: 'الأرشفة',
};

const formatDateTime = (value: string) =>
  new Date(value).toLocaleString('ar-SA-u-nu-latn', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });

const safeJson = (value: unknown) => {
  if (value === null || value === undefined) return 'لا توجد بيانات';

  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
};

const escapeCsv = (value: unknown) => {
  const text = String(value ?? '').replace(/"/g, '""');
  return `"${text}"`;
};

export const AuditLogPage: React.FC = () => {
  const [stats, setStats] = useState<AuditStats>(EMPTY_STATS);
  const [filtersData, setFiltersData] = useState<AuditFiltersResponse>({
    users: [],
    actions: [],
    modules: [],
  });
  const [data, setData] = useState<AuditListResponse>({
    items: [],
    page: 1,
    limit: 50,
    total: 0,
    totalPages: 1,
  });

  const [search, setSearch] = useState('');
  const [action, setAction] = useState('');
  const [moduleName, setModuleName] = useState('');
  const [status, setStatus] = useState('');
  const [userId, setUserId] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [page, setPage] = useState(1);

  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<AuditLogItem | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);

  const queryString = useMemo(() => {
    const params = new URLSearchParams({
      page: String(page),
      limit: '50',
    });

    if (search.trim()) params.set('search', search.trim());
    if (action) params.set('action', action);
    if (moduleName) params.set('module', moduleName);
    if (status) params.set('status', status);
    if (userId) params.set('userId', userId);
    if (from) params.set('from', from);
    if (to) params.set('to', to);

    return params.toString();
  }, [page, search, action, moduleName, status, userId, from, to]);

  const loadAll = async () => {
    try {
      setLoading(true);

      const [statsResponse, filtersResponse, listResponse] =
        await Promise.all([
          apiJson<AuditStats>('/api/audit/stats'),
          apiJson<AuditFiltersResponse>('/api/audit/filters'),
          apiJson<AuditListResponse>(`/api/audit?${queryString}`),
        ]);

      setStats(statsResponse);
      setFiltersData(filtersResponse);
      setData(listResponse);
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : 'تعذر تحميل سجل العمليات'
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
  }, [queryString]);

  const clearFilters = () => {
    setSearch('');
    setAction('');
    setModuleName('');
    setStatus('');
    setUserId('');
    setFrom('');
    setTo('');
    setPage(1);
  };

  const openDetails = async (item: AuditLogItem) => {
    try {
      const fullItem = await apiJson<AuditLogItem>(
        `/api/audit/${item.id}`
      );
      setSelected(fullItem);
      setDetailsOpen(true);
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : 'تعذر تحميل تفاصيل العملية'
      );
    }
  };

  const exportCsv = () => {
    const rows = [
      [
        'التاريخ',
        'المستخدم',
        'البريد',
        'الدور',
        'العملية',
        'القسم',
        'السجل',
        'الحالة',
        'عنوان IP',
        'الوصف',
      ],
      ...data.items.map((item) => [
        formatDateTime(item.createdAt),
        item.username || 'غير معروف',
        item.userEmail || '',
        item.userRole || '',
        actionLabels[item.action] || item.action,
        moduleLabels[item.module] || item.module,
        item.entityLabel || item.entityId || '',
        item.status === 'success' ? 'ناجحة' : 'فاشلة',
        item.ipAddress || '',
        item.description || '',
      ]),
    ];

    const csv = rows
      .map((row) => row.map(escapeCsv).join(','))
      .join('\n');

    const blob = new Blob([`\uFEFF${csv}`], {
      type: 'text/csv;charset=utf-8;',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');

    link.href = url;
    link.download = `audit-log-${new Date()
      .toISOString()
      .slice(0, 10)}.csv`;
    link.click();

    URL.revokeObjectURL(url);
  };

  return (
    <div className="container mx-auto space-y-6 p-4 md:p-6">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div>
          <div className="mb-2 flex items-center gap-2">
            <ShieldCheck className="h-7 w-7 text-primary" />
            <h1 className="text-2xl font-bold md:text-3xl">
              سجل العمليات والتدقيق
            </h1>
          </div>
          <p className="text-muted-foreground">
            متابعة العمليات الإدارية والأمنية ومعرفة المستخدم الذي نفذ كل إجراء.
          </p>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row">
          <Button variant="outline" onClick={exportCsv}>
            <Download className="ml-2 h-4 w-4" />
            تصدير CSV
          </Button>
          <Button variant="outline" onClick={() => window.print()}>
            طباعة التقرير
          </Button>
          <Button onClick={loadAll} disabled={loading}>
            <RefreshCcw
              className={`ml-2 h-4 w-4 ${
                loading ? 'animate-spin' : ''
              }`}
            />
            تحديث
          </Button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-8">
        <StatCard icon={Activity} label="إجمالي العمليات" value={stats.total} />
        <StatCard icon={CalendarDays} label="عمليات اليوم" value={stats.today} />
        <StatCard icon={Plus} label="عمليات الإضافة" value={stats.create} />
        <StatCard icon={Wrench} label="عمليات التعديل" value={stats.update} />
        <StatCard icon={Trash2} label="عمليات الحذف" value={stats.delete} />
        <StatCard icon={AlertTriangle} label="عمليات فاشلة" value={stats.failed} />
        <StatCard icon={LogIn} label="دخول فاشل" value={stats.failedLogins} />
        <StatCard icon={Users} label="مستخدمون اليوم" value={stats.activeUsersToday} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            البحث والتصفية
          </CardTitle>
        </CardHeader>

        <CardContent className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <div className="relative xl:col-span-2">
            <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setPage(1);
              }}
              placeholder="بحث بالمستخدم أو البريد أو رقم السجل أو الوصف..."
              className="pr-9"
            />
          </div>

          <NativeSelect
            value={userId}
            onChange={(event) => {
              setUserId(event.target.value);
              setPage(1);
            }}
          >
            <option value="">جميع المستخدمين</option>
            {filtersData.users.map((user) => (
              <option key={user.userId || user.userEmail || ''} value={user.userId || ''}>
                {user.username || user.userEmail || 'مستخدم'}
              </option>
            ))}
          </NativeSelect>

          <NativeSelect
            value={action}
            onChange={(event) => {
              setAction(event.target.value);
              setPage(1);
            }}
          >
            <option value="">جميع العمليات</option>
            {filtersData.actions.map((item) => (
              <option key={item} value={item}>
                {actionLabels[item] || item}
              </option>
            ))}
          </NativeSelect>

          <NativeSelect
            value={moduleName}
            onChange={(event) => {
              setModuleName(event.target.value);
              setPage(1);
            }}
          >
            <option value="">جميع الأقسام</option>
            {filtersData.modules.map((item) => (
              <option key={item} value={item}>
                {moduleLabels[item] || item}
              </option>
            ))}
          </NativeSelect>

          <NativeSelect
            value={status}
            onChange={(event) => {
              setStatus(event.target.value);
              setPage(1);
            }}
          >
            <option value="">جميع الحالات</option>
            <option value="success">ناجحة</option>
            <option value="failed">فاشلة</option>
          </NativeSelect>

          <Input
            type="date"
            value={from}
            onChange={(event) => {
              setFrom(event.target.value);
              setPage(1);
            }}
            title="من تاريخ"
          />

          <Input
            type="date"
            value={to}
            onChange={(event) => {
              setTo(event.target.value);
              setPage(1);
            }}
            title="إلى تاريخ"
          />

          <Button variant="outline" onClick={clearFilters}>
            مسح التصفية
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>
            العمليات المسجلة ({data.total})
          </CardTitle>
        </CardHeader>

        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>التاريخ والوقت</TableHead>
                  <TableHead>المستخدم</TableHead>
                  <TableHead>العملية</TableHead>
                  <TableHead>القسم</TableHead>
                  <TableHead>السجل</TableHead>
                  <TableHead>الحالة</TableHead>
                  <TableHead>عنوان IP</TableHead>
                  <TableHead className="text-center">التفاصيل</TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={8} className="py-12 text-center">
                      جاري تحميل سجل العمليات...
                    </TableCell>
                  </TableRow>
                ) : data.items.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="py-12 text-center text-muted-foreground">
                      لا توجد عمليات مطابقة للتصفية الحالية.
                    </TableCell>
                  </TableRow>
                ) : (
                  data.items.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="whitespace-nowrap">
                        {formatDateTime(item.createdAt)}
                      </TableCell>
                      <TableCell>
                        <div className="font-medium">
                          {item.username || 'غير معروف'}
                        </div>
                        <div className="text-xs text-muted-foreground" dir="ltr">
                          {item.userEmail || '-'}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {actionLabels[item.action] || item.action}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {moduleLabels[item.module] || item.module}
                      </TableCell>
                      <TableCell className="max-w-[230px]">
                        <div className="truncate">
                          {item.entityLabel || item.entityId || '-'}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            item.status === 'success'
                              ? 'secondary'
                              : 'destructive'
                          }
                        >
                          {item.status === 'success' ? 'ناجحة' : 'فاشلة'}
                        </Badge>
                      </TableCell>
                      <TableCell dir="ltr" className="text-left">
                        {item.ipAddress || '-'}
                      </TableCell>
                      <TableCell className="text-center">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openDetails(item)}
                          title="عرض التفاصيل"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          <div className="mt-4 flex flex-col items-center justify-between gap-3 sm:flex-row">
            <p className="text-sm text-muted-foreground">
              الصفحة {data.page} من {data.totalPages}
            </p>

            <div className="flex gap-2">
              <Button
                variant="outline"
                disabled={page <= 1 || loading}
                onClick={() => setPage((current) => Math.max(1, current - 1))}
              >
                السابق
              </Button>
              <Button
                variant="outline"
                disabled={page >= data.totalPages || loading}
                onClick={() =>
                  setPage((current) =>
                    Math.min(data.totalPages, current + 1)
                  )
                }
              >
                التالي
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent className="max-h-[90vh] max-w-4xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>تفاصيل العملية</DialogTitle>
            <DialogDescription>
              بيانات العملية والمستخدم والبيانات السابقة والجديدة.
            </DialogDescription>
          </DialogHeader>

          {selected && (
            <div className="space-y-5">
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                <Info label="المستخدم" value={selected.username || 'غير معروف'} />
                <Info label="البريد" value={selected.userEmail || '-'} />
                <Info label="الدور" value={selected.userRole || '-'} />
                <Info label="العملية" value={actionLabels[selected.action] || selected.action} />
                <Info label="القسم" value={moduleLabels[selected.module] || selected.module} />
                <Info label="الحالة" value={selected.status === 'success' ? 'ناجحة' : 'فاشلة'} />
                <Info label="السجل" value={selected.entityLabel || selected.entityId || '-'} />
                <Info label="التاريخ" value={formatDateTime(selected.createdAt)} />
                <Info label="عنوان IP" value={selected.ipAddress || '-'} />
              </div>

              {selected.description && (
                <InfoBlock label="وصف العملية" value={selected.description} />
              )}

              {selected.errorMessage && (
                <InfoBlock label="سبب الفشل" value={selected.errorMessage} destructive />
              )}

              <Separator />

              <JsonBlock label="البيانات السابقة" value={selected.previousData} />
              <JsonBlock label="البيانات الجديدة" value={selected.newData} />
              <JsonBlock label="بيانات تقنية إضافية" value={selected.metadata} />

              {selected.userAgent && (
                <InfoBlock label="الجهاز والمتصفح" value={selected.userAgent} />
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

const StatCard = ({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ElementType;
  label: string;
  value: number;
}) => (
  <Card>
    <CardContent className="flex items-center justify-between p-4">
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="mt-1 text-2xl font-bold">{value}</p>
      </div>
      <Icon className="h-7 w-7 text-primary" />
    </CardContent>
  </Card>
);

const Info = ({ label, value }: { label: string; value: string }) => (
  <div className="rounded-lg border p-3">
    <p className="text-xs text-muted-foreground">{label}</p>
    <p className="mt-1 break-words font-medium">{value}</p>
  </div>
);

const InfoBlock = ({
  label,
  value,
  destructive = false,
}: {
  label: string;
  value: string;
  destructive?: boolean;
}) => (
  <div className={`rounded-lg border p-4 ${destructive ? 'border-destructive/50 bg-destructive/5' : ''}`}>
    <p className="mb-2 text-sm text-muted-foreground">{label}</p>
    <p className="whitespace-pre-wrap break-words leading-7">{value}</p>
  </div>
);

const JsonBlock = ({ label, value }: { label: string; value: unknown }) => (
  <div className="rounded-lg border p-4">
    <p className="mb-2 text-sm font-semibold">{label}</p>
    <pre
      dir="ltr"
      className="max-h-72 overflow-auto rounded-md bg-muted/40 p-3 text-left text-xs leading-6"
    >
      {safeJson(value)}
    </pre>
  </div>
);
