import React from 'react';
import {
  ArrowRight,
  BriefcaseBusiness,
  Eye,
  FilePlus2,
  Search,
  TrendingUp,
} from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router';
import { toast } from 'sonner';
import { usePermissions } from '../../context/PermissionsContext';
import { investmentsApi } from '../../features/investments/api';
import type {
  InvestmentOpportunity,
  InvestmentOpportunityStatus,
  InvestmentSite,
} from '../../features/investments/types';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { NativeSelect } from '../components/ui/native-select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../components/ui/table';

const statusLabels: Record<InvestmentOpportunityStatus, string> = {
  IDENTIFIED: 'محددة',
  UNDER_STUDY: 'تحت الدراسة',
  PENDING_APPROVAL: 'بانتظار الموافقة',
  APPROVED: 'معتمدة',
  OFFERED: 'مطروحة',
  NEGOTIATION: 'تفاوض',
  INVESTED: 'مستثمرة',
  REJECTED: 'مرفوضة',
  CANCELLED: 'ملغاة',
};

const statusVariant = (
  status: InvestmentOpportunityStatus
): 'default' | 'secondary' | 'destructive' | 'outline' => {
  if (status === 'INVESTED') return 'secondary';
  if (status === 'REJECTED' || status === 'CANCELLED') return 'destructive';
  if (status === 'PENDING_APPROVAL' || status === 'APPROVED') return 'default';
  return 'outline';
};

const formatCurrency = (value: number, currency = 'SAR') =>
  new Intl.NumberFormat('ar-SA', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(value || 0);

export const InvestmentOpportunitiesPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { hasPermission, isAdmin } = usePermissions();
  const canAdd = isAdmin || hasPermission('investments', 'canAdd');

  const [items, setItems] = React.useState<InvestmentOpportunity[]>([]);
  const [sites, setSites] = React.useState<InvestmentSite[]>([]);
  const [stats, setStats] = React.useState({
    total: 0,
    identified: 0,
    underStudy: 0,
    pendingApproval: 0,
    approved: 0,
    offered: 0,
    negotiation: 0,
    invested: 0,
    rejected: 0,
    cancelled: 0,
    totalEstimatedValue: 0,
    investedEstimatedValue: 0,
    allocatedArea: 0,
  });
  const [pagination, setPagination] = React.useState({
    page: 1,
    limit: 25,
    total: 0,
    pages: 1,
  });
  const [loading, setLoading] = React.useState(true);
  const [search, setSearch] = React.useState('');
  const [siteId, setSiteId] = React.useState(
    () => searchParams.get('siteId') || ''
  );
  const [status, setStatus] = React.useState<InvestmentOpportunityStatus | ''>(
    () =>
      (searchParams.get('status') as InvestmentOpportunityStatus | null) || ''
  );
  const [page, setPage] = React.useState(1);

  const load = React.useCallback(async () => {
    try {
      setLoading(true);

      const [opportunities, siteResponse] = await Promise.all([
        investmentsApi.getOpportunities({
          search: search.trim() || undefined,
          siteId: siteId || undefined,
          status: status || undefined,
          page,
          limit: 25,
        }),
        investmentsApi.getSites({ limit: 100 }),
      ]);

      setItems(opportunities.items);
      setStats(opportunities.stats);
      setPagination(opportunities.pagination);
      setSites(siteResponse.items);

      if (page !== opportunities.pagination.page) {
        setPage(opportunities.pagination.page);
      }
    } catch (reason) {
      toast.error(
        reason instanceof Error
          ? reason.message
          : 'تعذر تحميل الفرص الاستثمارية'
      );
    } finally {
      setLoading(false);
    }
  }, [page, search, siteId, status]);

  React.useEffect(() => {
    const timer = window.setTimeout(load, 250);
    return () => window.clearTimeout(timer);
  }, [load]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
        <div>
          <Button
            variant="ghost"
            className="mb-2 px-0"
            onClick={() => navigate('/investments')}
          >
            <ArrowRight className="me-2 h-4 w-4" />
            المساحات والفرص الاستثمارية
          </Button>

          <h1 className="text-2xl font-bold">الفرص الاستثمارية</h1>
          <p className="mt-2 max-w-4xl text-sm leading-7 text-muted-foreground">
            إدارة دورة حياة الفرصة من تحديدها ودراستها واعتمادها وطرحها،
            وحتى التفاوض والاستثمار أو الإلغاء، مع ارتباط مباشر بالمساحة
            الاستثمارية الأصلية.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            onClick={() => navigate('/investments/executive')}
          >
            <TrendingUp className="me-2 h-4 w-4" />
            المؤشرات التنفيذية
          </Button>

          {canAdd && (
            <Button onClick={() => navigate('/investments/opportunities/new')}>
              <FilePlus2 className="me-2 h-4 w-4" />
              إنشاء فرصة
            </Button>
          )}
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">إجمالي الفرص</CardTitle>
          </CardHeader>
          <CardContent className="text-3xl font-bold">{stats.total}</CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">تحت الدراسة</CardTitle>
          </CardHeader>
          <CardContent className="text-3xl font-bold">
            {stats.underStudy}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">بانتظار الموافقة</CardTitle>
          </CardHeader>
          <CardContent className="text-3xl font-bold">
            {stats.pendingApproval}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">مطروحة / تفاوض</CardTitle>
          </CardHeader>
          <CardContent className="text-3xl font-bold">
            {stats.offered + stats.negotiation}
          </CardContent>
        </Card>

        <Card className="border-emerald-200 bg-emerald-50/40">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">مستثمرة</CardTitle>
          </CardHeader>
          <CardContent className="text-3xl font-bold">
            {stats.invested}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">القيمة التقديرية</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold">
              {formatCurrency(stats.totalEstimatedValue)}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              للمبالغ المسجلة في الفرص النشطة
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="grid gap-3 lg:grid-cols-[minmax(0,1.5fr)_minmax(220px,1fr)_minmax(220px,1fr)_auto]">
            <div className="relative">
              <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                className="pr-9"
                value={search}
                onChange={(event) => {
                  setSearch(event.target.value);
                  setPage(1);
                }}
                placeholder="رقم الفرصة، الاسم، الاستخدام، رمز المساحة..."
              />
            </div>

            <NativeSelect
              value={siteId}
              onChange={(event) => {
                setSiteId(event.target.value);
                setPage(1);
              }}
            >
              <option value="">جميع المواقع الرئيسية</option>
              {sites.map((site) => (
                <option key={site.id} value={site.id}>
                  {site.name}
                </option>
              ))}
            </NativeSelect>

            <NativeSelect
              value={status}
              onChange={(event) => {
                setStatus(
                  event.target.value as InvestmentOpportunityStatus | ''
                );
                setPage(1);
              }}
            >
              <option value="">جميع الحالات</option>
              {Object.entries(statusLabels).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </NativeSelect>

            <Button
              variant="outline"
              onClick={() => {
                setSearch('');
                setSiteId('');
                setStatus('');
                setPage(1);
              }}
            >
              إعادة تعيين
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>رقم الفرصة</TableHead>
                <TableHead>الفرصة</TableHead>
                <TableHead>الموقع / المساحة</TableHead>
                <TableHead>الحالة</TableHead>
                <TableHead>المساحة المخصصة</TableHead>
                <TableHead>القيمة التقديرية</TableHead>
                <TableHead>الإجراء</TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {items.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>
                    <div className="font-semibold" dir="ltr">
                      {item.opportunityNumber}
                    </div>
                  </TableCell>

                  <TableCell>
                    <p className="font-semibold">{item.title}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {item.investmentUse || 'الاستخدام لم يحدد بعد'}
                    </p>
                  </TableCell>

                  <TableCell>
                    <p>{item.area?.site?.name || '-'}</p>
                    <p className="mt-1 text-xs text-muted-foreground" dir="ltr">
                      {item.area?.areaCode || '-'}
                    </p>
                  </TableCell>

                  <TableCell>
                    <Badge variant={statusVariant(item.status)}>
                      {statusLabels[item.status]}
                    </Badge>
                  </TableCell>

                  <TableCell>
                    {item.allocatedArea == null
                      ? '-'
                      : `${Number(item.allocatedArea).toLocaleString(
                          'ar-SA',
                          { maximumFractionDigits: 2 }
                        )} م²`}
                  </TableCell>

                  <TableCell>
                    {item.estimatedValue == null
                      ? '-'
                      : formatCurrency(
                          Number(item.estimatedValue),
                          item.currency || 'SAR'
                        )}
                  </TableCell>

                  <TableCell>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() =>
                        navigate(`/investments/opportunities/${item.id}`)
                      }
                    >
                      <Eye className="me-1 h-4 w-4" />
                      فتح
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {loading && (
            <div className="p-10 text-center text-sm text-muted-foreground">
              جارٍ تحميل الفرص الاستثمارية...
            </div>
          )}

          {!loading && items.length === 0 && (
            <div className="p-12 text-center">
              <BriefcaseBusiness className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
              <p className="font-semibold">لا توجد فرص مطابقة</p>
              <p className="mt-2 text-sm text-muted-foreground">
                يتم إنشاء الفرصة من مساحة استوفت بوابة الجاهزية التشغيلية.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {pagination.pages > 1 && (
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm text-muted-foreground">
            صفحة {pagination.page} من {pagination.pages}
          </p>

          <div className="flex gap-2">
            <Button
              variant="outline"
              disabled={pagination.page <= 1 || loading}
              onClick={() =>
                setPage((current) => Math.max(1, current - 1))
              }
            >
              السابق
            </Button>
            <Button
              variant="outline"
              disabled={pagination.page >= pagination.pages || loading}
              onClick={() =>
                setPage((current) =>
                  Math.min(pagination.pages, current + 1)
                )
              }
            >
              التالي
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};
