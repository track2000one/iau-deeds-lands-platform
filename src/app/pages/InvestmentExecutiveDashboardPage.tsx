import React from 'react';
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  ClipboardCheck,
  FileText,
  Gauge,
  LandPlot,
  ListChecks,
  MapPinned,
  RefreshCw,
  ShieldCheck,
  Target,
  TrendingUp,
} from 'lucide-react';
import { useNavigate } from 'react-router';
import { toast } from 'sonner';
import { investmentsApi } from '../../features/investments/api';
import type {
  InvestmentExecutiveBlockerCode,
  InvestmentExecutiveDashboard,
} from '../../features/investments/types';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Progress } from '../components/ui/progress';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../components/ui/table';

const blockerLabels: Record<InvestmentExecutiveBlockerCode, string> = {
  MISSING_DEED: 'ربط الصك',
  MISSING_SITE_BOUNDARY: 'حدود الموقع الرئيسي',
  SITE_BOUNDARY_NOT_APPROVED: 'اعتماد حدود الموقع',
  AREA_NOT_AVAILABLE: 'إتاحة المساحة',
  READINESS_NOT_READY: 'استكمال الجاهزية',
  MISSING_AREA_BOUNDARY: 'حدود المساحة',
  AREA_BOUNDARY_NOT_APPROVED: 'اعتماد حدود المساحة',
  MISSING_SURVEYED_AREA: 'المساحة المساحية',
  MISSING_PROPOSED_USE: 'الاستخدام المقترح',
};

const EMPTY: InvestmentExecutiveDashboard = {
  generatedAt: '',
  methodology: {
    name: '',
    description: '',
    requiredChecks: [],
  },
  kpis: {
    siteCount: 0,
    areaCount: 0,
    totalApproximateArea: 0,
    totalReferenceArea: 0,
    availableAreaCount: 0,
    availableReferenceArea: 0,
    readyAreaCount: 0,
    readyReferenceArea: 0,
    opportunityCandidateCount: 0,
    opportunityCandidateArea: 0,
    blockedAreaCount: 0,
    deedLinkedSiteCount: 0,
    siteBoundaryCount: 0,
    approvedSiteBoundaryCount: 0,
    areaPolygonCount: 0,
    approvedAreaGeometryCount: 0,
    surveyedAreaCount: 0,
    proposedUseCount: 0,
    operationalCompletionPercent: 0,
  },
  distributions: {
    readiness: [],
    occupancy: [],
    geometryApproval: [],
  },
  blockers: [],
  siteRanking: [],
  closestToOpportunity: [],
  candidates: [],
};

const pct = (part: number, total: number) =>
  total > 0 ? Number(((part / total) * 100).toFixed(1)) : 0;

const formatArea = (value: number) =>
  value.toLocaleString('ar-SA', {
    maximumFractionDigits: 2,
  });

const formatDate = (value: string) => {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat('ar-SA', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
};

type CoverageBarProps = {
  label: string;
  value: number;
  total: number;
  hint: string;
};

const CoverageBar: React.FC<CoverageBarProps> = ({
  label,
  value,
  total,
  hint,
}) => {
  const percentage = pct(value, total);

  return (
    <div className="space-y-2 rounded-xl border p-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold">{label}</p>
          <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
        </div>
        <div className="text-left">
          <p className="font-bold">{percentage}%</p>
          <p className="text-xs text-muted-foreground">
            {value} / {total}
          </p>
        </div>
      </div>
      <Progress value={percentage} />
    </div>
  );
};

export const InvestmentExecutiveDashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const [data, setData] =
    React.useState<InvestmentExecutiveDashboard>(EMPTY);
  const [loading, setLoading] = React.useState(true);

  const load = React.useCallback(async () => {
    try {
      setLoading(true);
      setData(await investmentsApi.getExecutiveDashboard());
    } catch (reason) {
      toast.error(
        reason instanceof Error
          ? reason.message
          : 'تعذر تحميل لوحة مؤشرات الاستثمار التنفيذية'
      );
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    load();
  }, [load]);

  const kpis = data.kpis;
  const generatedAt = data.generatedAt
    ? formatDate(data.generatedAt)
    : '-';

  const readyAndAvailable = data.siteRanking.reduce(
    (sum, site) =>
      sum + Math.min(site.availableCount, site.readyCount),
    0
  );

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

          <h1 className="text-2xl font-bold">
            لوحة مؤشرات الاستثمار التنفيذية
          </h1>
          <p className="mt-2 max-w-4xl text-sm leading-7 text-muted-foreground">
            رؤية إدارية موحدة لربط الصكوك، اكتمال GIS، اعتماد الحدود، جاهزية
            الاستثمار، المساحات المتاحة، والمتطلبات المتبقية قبل تحويل المساحة
            إلى فرصة استثمارية داخل المنصة.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            onClick={() => navigate('/investments/gis-approvals')}
          >
            <ListChecks className="me-2 h-4 w-4" />
            مركز اعتماد GIS
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

      <Card className="border-sky-200 bg-sky-50/50">
        <CardContent className="flex items-start gap-3 p-4 text-sm leading-7 text-sky-950">
          <Gauge className="mt-1 h-5 w-5 shrink-0" />
          <div>
            <p className="font-semibold">منهجية المؤشر التشغيلي</p>
            <p>{data.methodology.description || 'جارٍ تحميل المنهجية...'}</p>
            <p className="mt-1 text-xs">
              آخر تحديث للبيانات: {generatedAt}
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">المواقع الرئيسية</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{kpis.siteCount}</div>
            <p className="mt-1 text-xs text-muted-foreground">
              مرتبطة بصك: {kpis.deedLinkedSiteCount}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">المساحات الاستثمارية</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{kpis.areaCount}</div>
            <p className="mt-1 text-xs text-muted-foreground">
              متاحة: {kpis.availableAreaCount}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">المساحة التقريبية</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-lg font-bold">
              {formatArea(kpis.totalApproximateArea)} م²
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              مجموع الحقول التقريبية المسجلة
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">جاهزة للاستثمار</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {kpis.readyAreaCount}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              متاحة وجاهزة تقريبًا: {readyAndAvailable}
            </p>
          </CardContent>
        </Card>

        <Card className="border-emerald-200 bg-emerald-50/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">
              مؤهلة للتحويل إلى فرصة
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {kpis.opportunityCandidateCount}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              {formatArea(kpis.opportunityCandidateArea)} م²
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">
              اكتمال المتطلبات التشغيلية
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {kpis.operationalCompletionPercent}%
            </div>
            <Progress
              className="mt-3"
              value={kpis.operationalCompletionPercent}
            />
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.25fr)_minmax(360px,.75fr)]">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <ClipboardCheck className="h-5 w-5" />
              اكتمال البيانات الحاكمة للتحويل إلى فرصة
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-2">
            <CoverageBar
              label="ربط المواقع بالصكوك"
              value={kpis.deedLinkedSiteCount}
              total={kpis.siteCount}
              hint="وجود صك واحد على الأقل مرتبط بالموقع الرئيسي"
            />
            <CoverageBar
              label="حدود المواقع الرئيسية"
              value={kpis.siteBoundaryCount}
              total={kpis.siteCount}
              hint="وجود Polygon محفوظ للموقع الرئيسي"
            />
            <CoverageBar
              label="اعتماد حدود المواقع"
              value={kpis.approvedSiteBoundaryCount}
              total={kpis.siteCount}
              hint="وصول حدود الموقع الرئيسي إلى حالة معتمدة"
            />
            <CoverageBar
              label="حدود المساحات"
              value={kpis.areaPolygonCount}
              total={kpis.areaCount}
              hint="وجود Polygon للمساحة الاستثمارية"
            />
            <CoverageBar
              label="اعتماد حدود المساحات"
              value={kpis.approvedAreaGeometryCount}
              total={kpis.areaCount}
              hint="اكتمال دورة اعتماد GIS للمساحة"
            />
            <CoverageBar
              label="المساحة المساحية"
              value={kpis.surveyedAreaCount}
              total={kpis.areaCount}
              hint="توفر surveyedArea بشكل مستقل عن المساحة التقريبية"
            />
            <CoverageBar
              label="الاستخدام المقترح"
              value={kpis.proposedUseCount}
              total={kpis.areaCount}
              hint="تحديد الاستخدام المقترح للمساحة"
            />
            <CoverageBar
              label="جاهزية الاستثمار"
              value={kpis.readyAreaCount}
              total={kpis.areaCount}
              hint="المساحات المصنفة READY"
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <AlertTriangle className="h-5 w-5" />
              أبرز العوائق الحالية
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {data.blockers.slice(0, 9).map((blocker) => (
              <div
                key={blocker.code}
                className="flex items-center justify-between gap-3 rounded-xl border p-3"
              >
                <div>
                  <p className="text-sm font-semibold">
                    {blocker.label}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    يؤثر على {blocker.count} مساحة
                  </p>
                </div>
                <Badge
                  variant={
                    blocker.severity === 'critical'
                      ? 'destructive'
                      : 'outline'
                  }
                >
                  {blocker.count}
                </Badge>
              </div>
            ))}

            {!loading && data.blockers.length === 0 && (
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-5 text-center">
                <CheckCircle2 className="mx-auto mb-2 h-7 w-7 text-emerald-700" />
                <p className="font-semibold">
                  لا توجد عوائق تشغيلية مسجلة
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-base">
                <TrendingUp className="h-5 w-5" />
                ترتيب المواقع حسب قرب اكتمال متطلبات الفرص
              </CardTitle>
              <p className="mt-1 text-xs leading-6 text-muted-foreground">
                الترتيب تشغيلي: عدد المساحات المؤهلة أولًا، ثم نسبة اكتمال
                المتطلبات، ثم حجم المساحات المرجعية. لا يمثل تقييمًا ماليًا أو
                أولوية طرح استثمارية معتمدة.
              </p>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>#</TableHead>
                <TableHead>الموقع الرئيسي</TableHead>
                <TableHead>الصكوك</TableHead>
                <TableHead>المساحات</TableHead>
                <TableHead>متاحة / جاهزة</TableHead>
                <TableHead>GIS معتمد</TableHead>
                <TableHead>مؤهلة للتحويل</TableHead>
                <TableHead>اكتمال المتطلبات</TableHead>
                <TableHead>الإجراء</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.siteRanking.map((site, index) => (
                <TableRow key={site.id}>
                  <TableCell>{index + 1}</TableCell>
                  <TableCell>
                    <div className="font-semibold">{site.name}</div>
                    <div className="mt-1 text-xs text-muted-foreground" dir="ltr">
                      {site.code}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={site.deedLinked ? 'secondary' : 'destructive'}
                    >
                      {site.deedCount}
                    </Badge>
                  </TableCell>
                  <TableCell>{site.areaCount}</TableCell>
                  <TableCell>
                    {site.availableCount} / {site.readyCount}
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">
                      {site.approvedGeometryCount} / {site.areaCount}
                    </div>
                    <div className="mt-1 text-xs text-muted-foreground">
                      الموقع:{' '}
                      {site.siteBoundaryApproved ? 'معتمد' : 'غير معتمد'}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="font-semibold">
                      {site.candidateCount}
                    </div>
                    <div className="mt-1 text-xs text-muted-foreground">
                      {formatArea(site.candidateArea)} م²
                    </div>
                  </TableCell>
                  <TableCell className="min-w-[180px]">
                    <div className="mb-2 flex items-center justify-between text-xs">
                      <span>{site.completionPercent}%</span>
                      <span className="text-muted-foreground">
                        {site.blockerCount} ملاحظات
                      </span>
                    </div>
                    <Progress value={site.completionPercent} />
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        navigate(
                          `/investments?siteId=${encodeURIComponent(site.id)}`
                        )
                      }
                    >
                      عرض المساحات
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {loading && (
            <div className="p-10 text-center text-sm text-muted-foreground">
              جارٍ احتساب المؤشرات التنفيذية...
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-5 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Target className="h-5 w-5" />
              الأقرب للتحويل إلى فرصة استثمارية
            </CardTitle>
            <p className="text-xs leading-6 text-muted-foreground">
              مساحات لم تستوف جميع الشروط بعد، مرتبة حسب أقل عدد من العوائق
              المتبقية.
            </p>
          </CardHeader>
          <CardContent className="space-y-3">
            {data.closestToOpportunity.map((area) => (
              <div
                key={area.id}
                className="rounded-xl border p-4"
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-semibold" dir="ltr">
                        {area.areaCode}
                      </p>
                      <Badge variant="outline">
                        {area.blockerCount} متطلبات متبقية
                      </Badge>
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {area.siteName}
                    </p>
                  </div>

                  <div className="text-left">
                    <p className="font-semibold">
                      {area.completionPercent}%
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatArea(area.referenceArea)} م²
                    </p>
                  </div>
                </div>

                <Progress
                  className="mt-3"
                  value={area.completionPercent}
                />

                <div className="mt-3 flex flex-wrap gap-1">
                  {area.blockers.map((blocker) => (
                    <Badge key={blocker} variant="outline">
                      {blockerLabels[blocker]}
                    </Badge>
                  ))}
                </div>

                <div className="mt-3 flex justify-end">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() =>
                      navigate(`/investments/areas/${area.id}`)
                    }
                  >
                    استكمال السجل
                  </Button>
                </div>
              </div>
            ))}

            {!loading && data.closestToOpportunity.length === 0 && (
              <div className="rounded-xl border p-8 text-center">
                <CheckCircle2 className="mx-auto mb-2 h-8 w-8 text-emerald-600" />
                <p className="font-semibold">
                  لا توجد مساحات قريبة بحاجة لاستكمال
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-emerald-200 bg-emerald-50/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <CheckCircle2 className="h-5 w-5" />
              مساحات استوفت بوابة التحويل
            </CardTitle>
            <p className="text-xs leading-6 text-muted-foreground">
              اجتازت جميع الشروط التشغيلية التسعة المستخدمة في هذه اللوحة.
            </p>
          </CardHeader>
          <CardContent className="space-y-3">
            {data.candidates.slice(0, 12).map((area) => (
              <div
                key={area.id}
                className="flex flex-col gap-3 rounded-xl border bg-background p-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold" dir="ltr">
                      {area.areaCode}
                    </p>
                    <Badge variant="secondary">مؤهلة</Badge>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {area.siteName}
                  </p>
                  {area.proposedUse && (
                    <p className="mt-1 text-xs text-muted-foreground">
                      الاستخدام المقترح: {area.proposedUse}
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-3">
                  <div className="text-left">
                    <p className="font-semibold">
                      {formatArea(area.referenceArea)} م²
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      navigate(`/investments/areas/${area.id}`)
                    }
                  >
                    فتح
                  </Button>
                </div>
              </div>
            ))}

            {!loading && data.candidates.length === 0 && (
              <div className="rounded-xl border border-dashed p-8 text-center">
                <LandPlot className="mx-auto mb-2 h-8 w-8 text-muted-foreground" />
                <p className="font-semibold">
                  لا توجد مساحة استوفت جميع الشروط حتى الآن
                </p>
                <p className="mt-2 text-xs leading-6 text-muted-foreground">
                  ابدأ بمعالجة العوائق الأعلى تكرارًا، ثم أعد تحديث اللوحة.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <FileText className="h-5 w-5" />
            التوزيعات التنفيذية
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 lg:grid-cols-3">
          <div className="rounded-xl border p-4">
            <p className="mb-3 font-semibold">جاهزية الاستثمار</p>
            <div className="space-y-2">
              {data.distributions.readiness.map((item) => (
                <div
                  key={item.status}
                  className="flex items-center justify-between text-sm"
                >
                  <span>{item.label}</span>
                  <Badge variant="outline">{item.count}</Badge>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-xl border p-4">
            <p className="mb-3 font-semibold">حالة الإشغال</p>
            <div className="space-y-2">
              {data.distributions.occupancy.map((item) => (
                <div
                  key={item.status}
                  className="flex items-center justify-between text-sm"
                >
                  <span>{item.label}</span>
                  <Badge variant="outline">{item.count}</Badge>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-xl border p-4">
            <p className="mb-3 font-semibold">اعتماد حدود GIS</p>
            <div className="space-y-2">
              {data.distributions.geometryApproval.map((item) => (
                <div
                  key={item.status}
                  className="flex items-center justify-between text-sm"
                >
                  <span>{item.label}</span>
                  <Badge variant="outline">{item.count}</Badge>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-amber-200 bg-amber-50/50">
        <CardContent className="flex items-start gap-3 p-4 text-sm leading-7 text-amber-950">
          <AlertTriangle className="mt-1 h-5 w-5 shrink-0" />
          <div>
            <p className="font-semibold">
              «مؤهلة للتحويل» ليست فرصة استثمارية منشأة
            </p>
            <p>
              المنصة لا تحتوي حتى الآن على كيان مستقل لدورة حياة
              InvestmentOpportunity. هذا المؤشر يعني فقط أن البيانات التشغيلية
              الحالية اكتملت وفق البوابة الداخلية الموضحة أعلاه، تمهيدًا
              للمرحلة التالية الخاصة بإنشاء الفرصة ودراستها واعتمادها وطرحها.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
