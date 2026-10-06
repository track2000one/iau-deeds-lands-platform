import React from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { Eye, LandPlot, MapPin, Search } from 'lucide-react';
import { toast } from 'sonner';
import { usePermissions } from '../../context/PermissionsContext';
import { investmentsApi } from '../../features/investments/api';
import type {
  InvestmentArea,
  InvestmentAreaStatus,
  InvestmentSite,
} from '../../features/investments/types';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Input } from '../components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../components/ui/table';

const statusLabels: Record<InvestmentAreaStatus, string> = {
  AVAILABLE: 'متاحة',
  OCCUPIED: 'مشغولة',
  PARTIALLY_OCCUPIED: 'مستغلة جزئيًا',
  RESERVED: 'محجوزة',
  ALLOCATED: 'مخصصة',
  UNAVAILABLE: 'غير متاحة',
};

const readinessLabels: Record<string, string> = {
  NOT_ASSESSED: 'لم تُقيّم',
  UNDER_REVIEW: 'تحت الدراسة',
  READY: 'جاهزة للاستثمار',
  NOT_SUITABLE: 'غير مناسبة',
};

export const InvestmentsPage: React.FC = () => {
  const navigate = useNavigate();
  const [queryParams] = useSearchParams();
  const { hasPermission, isAdmin } = usePermissions();

  const [areas, setAreas] = React.useState<InvestmentArea[]>([]);
  const [sites, setSites] = React.useState<InvestmentSite[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [search, setSearch] = React.useState('');
  const [siteId, setSiteId] = React.useState(() => queryParams.get('siteId') || '');
  const [status, setStatus] = React.useState<InvestmentAreaStatus | ''>('');

  const canAdd = isAdmin || hasPermission('investments', 'canAdd');

  const loadData = React.useCallback(async () => {
    try {
      setLoading(true);

      const [areasResponse, sitesResponse] = await Promise.all([
        investmentsApi.getAreas({
          search: search.trim() || undefined,
          siteId: siteId || undefined,
          status: status || undefined,
          limit: 100,
        }),
        investmentsApi.getSites({ limit: 100 }),
      ]);

      setAreas(areasResponse.items);
      setSites(sitesResponse.items);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'تعذر تحميل بيانات المساحات الاستثمارية');
    } finally {
      setLoading(false);
    }
  }, [search, siteId, status]);

  React.useEffect(() => {
    const timer = window.setTimeout(loadData, 250);
    return () => window.clearTimeout(timer);
  }, [loadData]);

  const availableCount = areas.filter((item) => item.occupancyStatus === 'AVAILABLE').length;
  const readyCount = areas.filter((item) => item.investmentReadiness === 'READY').length;
  const totalArea = areas.reduce(
    (sum, item) => sum + Number(item.approximateArea || 0),
    0
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold">المساحات والفرص الاستثمارية</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            إدارة ومتابعة المساحات غير المشغولة والفرص الاستثمارية المرتبطة بأصول الجامعة.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => navigate('/investments/sites')}>
            المواقع الرئيسية
          </Button>
          <Button variant="outline" onClick={() => navigate('/maps')}>
            <MapPin className="me-2 h-4 w-4" />
            خريطة الصكوك
          </Button>
          {canAdd && (
            <Button onClick={() => navigate('/investments/areas/new')}>
              إضافة مساحة
            </Button>
          )}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">إجمالي المساحات الظاهرة</CardTitle>
          </CardHeader>
          <CardContent><div className="text-3xl font-bold">{areas.length}</div></CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">المساحات المتاحة</CardTitle>
          </CardHeader>
          <CardContent><div className="text-3xl font-bold">{availableCount}</div></CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">جاهزة للاستثمار</CardTitle>
          </CardHeader>
          <CardContent><div className="text-3xl font-bold">{readyCount}</div></CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">إجمالي المساحة التقريبية</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold">
              {totalArea.toLocaleString('ar-SA', { maximumFractionDigits: 2 })} م²
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="grid gap-3 lg:grid-cols-[minmax(0,1.6fr)_minmax(220px,1fr)_minmax(200px,0.8fr)_auto]">
            <div className="relative">
              <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="البحث برمز المساحة أو اسم الموقع..."
                className="pr-9"
              />
            </div>

            <select
              className="h-10 rounded-md border border-input bg-background px-3 text-sm"
              value={siteId}
              onChange={(event) => setSiteId(event.target.value)}
            >
              <option value="">جميع المواقع الرئيسية</option>
              {sites.map((site) => (
                <option key={site.id} value={site.id}>{site.name}</option>
              ))}
            </select>

            <select
              className="h-10 rounded-md border border-input bg-background px-3 text-sm"
              value={status}
              onChange={(event) => setStatus(event.target.value as InvestmentAreaStatus | '')}
            >
              <option value="">جميع الحالات</option>
              {Object.entries(statusLabels).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>

            <Button
              variant="outline"
              onClick={() => {
                setSearch('');
                setSiteId('');
                setStatus('');
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
                <TableHead>الرمز</TableHead>
                <TableHead>الموقع الرئيسي</TableHead>
                <TableHead>المساحة التقريبية</TableHead>
                <TableHead>الحالة</TableHead>
                <TableHead>جاهزية الاستثمار</TableHead>
                <TableHead className="w-[90px]">الإجراء</TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {areas.map((area) => (
                <TableRow key={area.id}>
                  <TableCell className="font-semibold">{area.areaCode}</TableCell>
                  <TableCell>{area.site?.name || '-'}</TableCell>
                  <TableCell>
                    {area.approximateArea == null
                      ? '-'
                      : `${Number(area.approximateArea).toLocaleString('ar-SA', { maximumFractionDigits: 2 })} م²`}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{statusLabels[area.occupancyStatus]}</Badge>
                  </TableCell>
                  <TableCell>{readinessLabels[area.investmentReadiness] || area.investmentReadiness}</TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => navigate(`/investments/areas/${area.id}`)}
                    >
                      <Eye className="me-1 h-4 w-4" />
                      عرض
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {loading && (
            <div className="p-10 text-center text-sm text-muted-foreground">جارٍ تحميل البيانات...</div>
          )}

          {!loading && areas.length === 0 && (
            <div className="p-12 text-center">
              <LandPlot className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
              <p className="font-semibold">لا توجد مساحات مطابقة</p>
              <p className="mt-1 text-sm text-muted-foreground">
                ستظهر هنا المساحات الاستثمارية بعد إضافتها وربطها بالمواقع الرئيسية.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
