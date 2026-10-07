import React from 'react';
import {
  ArrowRight,
  CheckCircle2,
  Clock3,
  ExternalLink,
  FileCheck2,
  LandPlot,
  ListChecks,
  MapPinned,
  RefreshCw,
  RotateCcw,
  Search,
  ShieldCheck,
  TrendingUp,
} from 'lucide-react';
import { useNavigate } from 'react-router';
import { toast } from 'sonner';
import { usePermissions } from '../../context/PermissionsContext';
import { investmentsApi } from '../../features/investments/api';
import type {
  GeometryApprovalQueueItem,
  GeometryApprovalQueueResponse,
  GeometryApprovalStatus,
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

const statusLabels: Record<GeometryApprovalStatus, string> = {
  DRAFT: 'مسودة',
  REVIEWED: 'تمت المراجعة',
  APPROVED: 'معتمدة',
  CHANGE_REQUESTED: 'طلب تعديل',
};

const accuracyLabels: Record<string, string> = {
  APPROXIMATE: 'تقريبية',
  FIELD_VERIFIED: 'متحقق منها ميدانيًا',
  SURVEYED: 'رفع مساحي',
  OFFICIAL: 'رسمية/معتمدة',
};

const EMPTY_RESPONSE: GeometryApprovalQueueResponse = {
  items: [],
  stats: {
    total: 0,
    draft: 0,
    reviewed: 0,
    approved: 0,
    changeRequested: 0,
    pendingReview: 0,
    pendingApproval: 0,
    actionRequired: 0,
    sites: 0,
    areas: 0,
    approvedPercent: 0,
  },
  pagination: {
    page: 1,
    limit: 25,
    total: 0,
    pages: 1,
  },
};

const formatDate = (value?: string | null) => {
  if (!value) return '-';

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat('ar-SA', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
};

const statusVariant = (
  status: GeometryApprovalStatus
): 'default' | 'secondary' | 'destructive' | 'outline' => {
  if (status === 'APPROVED') return 'secondary';
  if (status === 'CHANGE_REQUESTED') return 'destructive';
  if (status === 'REVIEWED') return 'default';
  return 'outline';
};

export const InvestmentGisApprovalCenterPage: React.FC = () => {
  const navigate = useNavigate();
  const { hasPermission, isAdmin } = usePermissions();
  const canEdit = isAdmin || hasPermission('investments', 'canEdit');

  const [data, setData] =
    React.useState<GeometryApprovalQueueResponse>(EMPTY_RESPONSE);
  const [sites, setSites] = React.useState<InvestmentSite[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [approvingId, setApprovingId] = React.useState<string | null>(null);

  const [search, setSearch] = React.useState('');
  const [status, setStatus] = React.useState<
    'ALL' | GeometryApprovalStatus
  >('ALL');
  const [entityType, setEntityType] = React.useState<
    'ALL' | 'investment_site' | 'investment_area'
  >('ALL');
  const [siteId, setSiteId] = React.useState('');
  const [geometry, setGeometry] =
    React.useState<'with' | 'without' | 'all'>('with');
  const [sort, setSort] =
    React.useState<'priority' | 'updated_desc' | 'approved_desc'>(
      'priority'
    );
  const [page, setPage] = React.useState(1);

  const load = React.useCallback(async () => {
    try {
      setLoading(true);

      const [queue, siteResponse] = await Promise.all([
        investmentsApi.getGeometryApprovalQueue({
          search: search.trim() || undefined,
          status,
          entityType,
          siteId: siteId || undefined,
          geometry,
          sort,
          page,
          limit: 25,
        }),
        investmentsApi.getSites({ limit: 100 }),
      ]);

      setData(queue);
      setSites(siteResponse.items);

      if (page !== queue.pagination.page) {
        setPage(queue.pagination.page);
      }
    } catch (reason) {
      toast.error(
        reason instanceof Error
          ? reason.message
          : 'تعذر تحميل مركز اعتماد GIS'
      );
    } finally {
      setLoading(false);
    }
  }, [entityType, geometry, page, search, siteId, sort, status]);

  React.useEffect(() => {
    const timer = window.setTimeout(load, 250);
    return () => window.clearTimeout(timer);
  }, [load]);

  const resetFilters = () => {
    setSearch('');
    setStatus('ALL');
    setEntityType('ALL');
    setSiteId('');
    setGeometry('with');
    setSort('priority');
    setPage(1);
  };

  const openRecord = (item: GeometryApprovalQueueItem) => {
    if (item.entityType === 'investment_area') {
      navigate(`/investments/areas/${item.id}`);
      return;
    }

    if (canEdit) {
      navigate(`/investments/sites/${item.id}/edit`);
      return;
    }

    navigate('/investments/sites');
  };

  const approve = async (item: GeometryApprovalQueueItem) => {
    if (!isAdmin) return;

    if (item.geometryApprovalStatus !== 'REVIEWED') {
      toast.error('هذا السجل ليس في مرحلة انتظار الاعتماد.');
      return;
    }

    if (!item.geometryReferenceAttachmentId) {
      toast.error(
        'لا يوجد مرفق مرجعي مرتبط بالمراجعة. افتح السجل واستكمل المرفق أولًا.'
      );
      return;
    }

    if (
      !window.confirm(
        `سيتم اعتماد حدود ${item.code} وقفل تعديل Polygon والإحداثيات ومستوى الدقة. هل تريد المتابعة؟`
      )
    ) {
      return;
    }

    try {
      setApprovingId(item.id);

      await investmentsApi.runGeometryWorkflow(
        item.entityType,
        item.id,
        {
          action: 'APPROVE',
          referenceAttachmentId:
            item.geometryReferenceAttachmentId,
        }
      );

      toast.success(`تم اعتماد حدود ${item.code} وقفلها.`);
      await load();
    } catch (reason) {
      toast.error(
        reason instanceof Error
          ? reason.message
          : 'تعذر اعتماد الحدود'
      );
    } finally {
      setApprovingId(null);
    }
  };

  const stats = data.stats;

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

          <h1 className="text-2xl font-bold">مركز اعتماد GIS</h1>
          <p className="mt-2 max-w-4xl text-sm leading-7 text-muted-foreground">
            قائمة مركزية لمتابعة دورة اعتماد حدود المواقع الرئيسية والمساحات
            الاستثمارية، ومعرفة ما ينتظر المراجعة أو الاعتماد، وما تم اعتماده،
            ومن قام بالمراجعة أو الاعتماد ومتى.
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
          <Button
            variant="outline"
            onClick={() => navigate('/investments/gis-audit')}
          >
            <ShieldCheck className="me-2 h-4 w-4" />
            تدقيق GIS
          </Button>

          <Button variant="outline" onClick={load} disabled={loading}>
            <RefreshCw className="me-2 h-4 w-4" />
            تحديث
          </Button>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">إجمالي الحدود</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.total}</div>
            <p className="mt-1 text-xs text-muted-foreground">
              {stats.sites} مواقع رئيسية + {stats.areas} مساحات
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">بانتظار المراجعة</CardTitle>
          </CardHeader>
          <CardContent className="text-3xl font-bold">
            {stats.pendingReview}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">بانتظار الاعتماد</CardTitle>
          </CardHeader>
          <CardContent className="text-3xl font-bold">
            {stats.pendingApproval}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">طلبات تعديل</CardTitle>
          </CardHeader>
          <CardContent className="text-3xl font-bold">
            {stats.changeRequested}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">الحدود المعتمدة</CardTitle>
          </CardHeader>
          <CardContent className="text-3xl font-bold">
            {stats.approved}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">نسبة الاعتماد</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {stats.approvedPercent}%
            </div>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-primary transition-all"
                style={{
                  width: `${Math.min(
                    100,
                    Math.max(0, stats.approvedPercent)
                  )}%`,
                }}
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {stats.actionRequired > 0 && (
        <Card className="border-amber-200 bg-amber-50/60">
          <CardContent className="flex flex-col gap-3 p-4 text-sm text-amber-950 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <Clock3 className="mt-0.5 h-5 w-5 shrink-0" />
              <div>
                <p className="font-semibold">
                  توجد {stats.actionRequired} سجلات تحتاج إجراء
                </p>
                <p className="mt-1 leading-6">
                  تشمل الحدود التي تمت مراجعتها وتنتظر الاعتماد، إضافة إلى
                  طلبات تعديل الحدود المفتوحة.
                </p>
              </div>
            </div>

            <Button
              variant="outline"
              onClick={() => {
                setStatus('REVIEWED');
                setPage(1);
              }}
            >
              عرض المنتظر للاعتماد
            </Button>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">البحث والتصفية</CardTitle>
        </CardHeader>

        <CardContent>
          <div className="grid gap-3 lg:grid-cols-3 xl:grid-cols-6">
            <div className="relative lg:col-span-2">
              <Search className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                className="pr-9"
                value={search}
                onChange={(event) => {
                  setSearch(event.target.value);
                  setPage(1);
                }}
                placeholder="الرمز، الاسم، المراجع أو المعتمد..."
              />
            </div>

            <NativeSelect
              value={status}
              onChange={(event) => {
                setStatus(
                  event.target.value as 'ALL' | GeometryApprovalStatus
                );
                setPage(1);
              }}
            >
              <option value="ALL">جميع حالات الاعتماد</option>
              <option value="DRAFT">مسودة / بانتظار المراجعة</option>
              <option value="REVIEWED">تمت المراجعة / بانتظار الاعتماد</option>
              <option value="APPROVED">معتمدة</option>
              <option value="CHANGE_REQUESTED">طلب تعديل مفتوح</option>
            </NativeSelect>

            <NativeSelect
              value={entityType}
              onChange={(event) => {
                setEntityType(
                  event.target.value as
                    | 'ALL'
                    | 'investment_site'
                    | 'investment_area'
                );
                setPage(1);
              }}
            >
              <option value="ALL">المواقع والمساحات</option>
              <option value="investment_site">المواقع الرئيسية فقط</option>
              <option value="investment_area">المساحات فقط</option>
            </NativeSelect>

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
              value={geometry}
              onChange={(event) => {
                setGeometry(
                  event.target.value as 'with' | 'without' | 'all'
                );
                setPage(1);
              }}
            >
              <option value="with">لديها حدود Polygon</option>
              <option value="without">بدون حدود Polygon</option>
              <option value="all">الجميع</option>
            </NativeSelect>

            <NativeSelect
              value={sort}
              onChange={(event) => {
                setSort(
                  event.target.value as
                    | 'priority'
                    | 'updated_desc'
                    | 'approved_desc'
                );
                setPage(1);
              }}
            >
              <option value="priority">الأولوية الإجرائية</option>
              <option value="updated_desc">الأحدث تعديلًا</option>
              <option value="approved_desc">الأحدث اعتمادًا</option>
            </NativeSelect>

            <Button variant="outline" onClick={resetFilters}>
              إعادة تعيين
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle className="flex items-center gap-2 text-base">
              <ListChecks className="h-5 w-5" />
              قائمة الاعتماد
            </CardTitle>
            <Badge variant="outline">
              {data.pagination.total} سجل مطابق
            </Badge>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>السجل</TableHead>
                <TableHead>الموقع الرئيسي</TableHead>
                <TableHead>الحالة</TableHead>
                <TableHead>الدقة</TableHead>
                <TableHead>المراجعة</TableHead>
                <TableHead>الاعتماد</TableHead>
                <TableHead>المرفق المرجعي</TableHead>
                <TableHead className="w-[210px]">الإجراء</TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {data.items.map((item) => (
                <TableRow key={`${item.entityType}-${item.id}`}>
                  <TableCell>
                    <div className="flex items-start gap-2">
                      {item.entityType === 'investment_site' ? (
                        <MapPinned className="mt-0.5 h-4 w-4 text-muted-foreground" />
                      ) : (
                        <LandPlot className="mt-0.5 h-4 w-4 text-muted-foreground" />
                      )}

                      <div>
                        <p className="font-semibold" dir="ltr">
                          {item.code}
                        </p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {item.name}
                        </p>
                        <Badge
                          variant="outline"
                          className="mt-2"
                        >
                          {item.entityType === 'investment_site'
                            ? 'موقع رئيسي'
                            : 'مساحة استثمارية'}
                        </Badge>
                      </div>
                    </div>
                  </TableCell>

                  <TableCell>
                    {item.entityType === 'investment_site'
                      ? item.name
                      : item.parentSite?.name || '-'}
                    {item.entityType === 'investment_site' &&
                      item.childAreaCount != null && (
                        <p className="mt-1 text-xs text-muted-foreground">
                          {item.childAreaCount} مساحات تابعة
                        </p>
                      )}
                  </TableCell>

                  <TableCell>
                    <Badge
                      variant={statusVariant(
                        item.geometryApprovalStatus
                      )}
                    >
                      {statusLabels[item.geometryApprovalStatus]}
                    </Badge>
                  </TableCell>

                  <TableCell>
                    {accuracyLabels[item.geometryAccuracy] ||
                      item.geometryAccuracy}
                  </TableCell>

                  <TableCell>
                    <p className="font-medium">
                      {item.geometryReviewedByName || '-'}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {formatDate(item.geometryReviewedAt)}
                    </p>
                  </TableCell>

                  <TableCell>
                    <p className="font-medium">
                      {item.geometryApprovedByName || '-'}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {formatDate(item.geometryApprovedAt)}
                    </p>
                  </TableCell>

                  <TableCell>
                    {item.referenceAttachment ? (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() =>
                          window.open(
                            item.referenceAttachment!.driveUrl,
                            '_blank',
                            'noopener,noreferrer'
                          )
                        }
                      >
                        <ExternalLink className="me-1 h-4 w-4" />
                        {item.referenceAttachment.title}
                      </Button>
                    ) : (
                      <span className="text-xs text-muted-foreground">
                        غير مرتبط
                      </span>
                    )}
                  </TableCell>

                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => openRecord(item)}
                      >
                        {item.geometryApprovalStatus === 'DRAFT' &&
                        canEdit ? (
                          <>
                            <FileCheck2 className="me-1 h-4 w-4" />
                            مراجعة
                          </>
                        ) : item.geometryApprovalStatus ===
                          'CHANGE_REQUESTED' && canEdit ? (
                          <>
                            <RotateCcw className="me-1 h-4 w-4" />
                            تعديل
                          </>
                        ) : (
                          'فتح السجل'
                        )}
                      </Button>

                      {isAdmin &&
                        item.geometryApprovalStatus === 'REVIEWED' && (
                          <Button
                            size="sm"
                            disabled={approvingId === item.id}
                            onClick={() => approve(item)}
                          >
                            <CheckCircle2 className="me-1 h-4 w-4" />
                            {approvingId === item.id
                              ? 'جارٍ الاعتماد...'
                              : 'اعتماد'}
                          </Button>
                        )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {loading && (
            <div className="p-10 text-center text-sm text-muted-foreground">
              جارٍ تحميل قائمة الاعتماد...
            </div>
          )}

          {!loading && data.items.length === 0 && (
            <div className="p-12 text-center">
              <ShieldCheck className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
              <p className="font-semibold">لا توجد سجلات مطابقة</p>
              <p className="mt-1 text-sm text-muted-foreground">
                عدّل عوامل التصفية أو أضف حدودًا جغرافية للسجلات المطلوبة.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {data.pagination.pages > 1 && (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-muted-foreground">
            صفحة {data.pagination.page} من {data.pagination.pages}
          </p>

          <div className="flex gap-2">
            <Button
              variant="outline"
              disabled={data.pagination.page <= 1 || loading}
              onClick={() =>
                setPage((current) => Math.max(1, current - 1))
              }
            >
              السابق
            </Button>
            <Button
              variant="outline"
              disabled={
                data.pagination.page >= data.pagination.pages || loading
              }
              onClick={() =>
                setPage((current) =>
                  Math.min(data.pagination.pages, current + 1)
                )
              }
            >
              التالي
            </Button>
          </div>
        </div>
      )}

      <Card className="border-sky-200 bg-sky-50/50">
        <CardContent className="flex items-start gap-3 p-4 text-sm leading-7 text-sky-950">
          <ShieldCheck className="mt-1 h-5 w-5 shrink-0" />
          <div>
            <p className="font-semibold">ضبط الاعتماد</p>
            <p>
              مركز الاعتماد لا يتجاوز دورة الحوكمة: المراجعة تتطلب مرفقًا
              مرجعيًا، والاعتماد النهائي متاح للمسؤول فقط، والحدود المعتمدة
              تبقى مقفلة حتى تسجيل طلب تعديل موثق.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
