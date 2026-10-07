import React from 'react';
import { ArrowRight, BriefcaseBusiness, Download, FileJson, FileText, Globe2, MapPin, Pencil, Plus } from 'lucide-react';
import { useNavigate, useParams } from 'react-router';
import { toast } from 'sonner';
import { usePermissions } from '../../context/PermissionsContext';
import { investmentsApi } from '../../features/investments/api';
import type { InvestmentArea } from '../../features/investments/types';
import { buildPolygonFeature, getPolygonMetrics } from '../../features/investments/geometry';
import {
  downloadGeoJson,
  downloadKml,
  downloadKmz,
} from '../../features/investments/geometryFiles';
import { GeometryApprovalPanel } from '../components/GeometryApprovalPanel';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';

const statusLabels: Record<string, string> = {
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

export const InvestmentAreaDetailsPage: React.FC = () => {
  const navigate = useNavigate();
  const { areaId } = useParams();
  const { hasPermission, isAdmin } = usePermissions();
  const canEdit = isAdmin || hasPermission('investments', 'canEdit');
  const canAddAttachment =
    isAdmin || hasPermission('investments', 'canAdd');
  const [area, setArea] = React.useState<InvestmentArea | null>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    if (!areaId) return;

    investmentsApi.getArea(areaId)
      .then(setArea)
      .catch((error) => {
        toast.error(error instanceof Error ? error.message : 'تعذر تحميل بيانات المساحة');
      })
      .finally(() => setLoading(false));
  }, [areaId]);

  if (loading) {
    return <div className="p-10 text-center text-sm text-muted-foreground">جارٍ تحميل بيانات المساحة...</div>;
  }

  if (!area) {
    return (
      <div className="space-y-4">
        <p>تعذر العثور على المساحة المطلوبة.</p>
        <Button variant="outline" onClick={() => navigate('/investments')}>العودة</Button>
      </div>
    );
  }

  const deed = area.site?.deed;
  const polygonMetrics = getPolygonMetrics(area.geoJson);
  const exportFeature = buildPolygonFeature(polygonMetrics.points);

  const exportKmz = async () => {
    if (!exportFeature) return;

    try {
      await downloadKmz(exportFeature, area.areaCode);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'تعذر تصدير ملف KMZ');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <Button variant="ghost" className="mb-2 px-0" onClick={() => navigate('/investments')}>
            <ArrowRight className="me-2 h-4 w-4" />
            المساحات والفرص الاستثمارية
          </Button>
          <h1 className="text-2xl font-bold">
            {area.site?.name || 'الموقع'} — {area.areaCode}
          </h1>
          <div className="mt-2 flex flex-wrap gap-2">
            <Badge variant="outline">{statusLabels[area.occupancyStatus] || area.occupancyStatus}</Badge>
            <Badge variant="secondary">{readinessLabels[area.investmentReadiness] || area.investmentReadiness}</Badge>
            <Badge variant="outline">
              {area.geometryAccuracy === 'APPROXIMATE' ? 'بيانات تقريبية' : area.geometryAccuracy}
            </Badge>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {exportFeature && (
            <>
              <Button
                variant="outline"
                onClick={() => downloadGeoJson(exportFeature, area.areaCode)}
              >
                <FileJson className="me-2 h-4 w-4" />
                GeoJSON
              </Button>
              <Button
                variant="outline"
                onClick={() => downloadKml(exportFeature, area.areaCode)}
              >
                <Globe2 className="me-2 h-4 w-4" />
                KML
              </Button>
              <Button variant="outline" onClick={exportKmz}>
                <Download className="me-2 h-4 w-4" />
                KMZ
              </Button>
            </>
          )}

          {canEdit && (
            <Button onClick={() => navigate(`/investments/areas/${area.id}/edit`)}>
              <Pencil className="me-2 h-4 w-4" />
              تعديل البيانات
            </Button>
          )}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>بيانات المساحة</CardTitle></CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div>
              <p className="text-xs text-muted-foreground">رقم الموقع</p>
              <p className="font-semibold">{area.areaNumber}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">الرمز</p>
              <p className="font-semibold">{area.areaCode}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">المساحة التقريبية</p>
              <p className="font-semibold">
                {area.approximateArea == null ? '-' : `${Number(area.approximateArea).toLocaleString('ar-SA')} م²`}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">المساحة المساحية المعتمدة</p>
              <p className="font-semibold">
                {area.surveyedArea == null ? 'غير متوفرة' : `${Number(area.surveyedArea).toLocaleString('ar-SA')} م²`}
              </p>
            </div>
            <div className="sm:col-span-2">
              <p className="text-xs text-muted-foreground">الاستخدام الحالي</p>
              <p className="font-semibold">{area.currentUse || 'غير محدد'}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><MapPin className="h-4 w-4" /> الموقع الجغرافي</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div>
              <p className="text-xs text-muted-foreground">خط العرض</p>
              <p className="font-semibold">{area.latitude ?? '-'}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">خط الطول</p>
              <p className="font-semibold">{area.longitude ?? '-'}</p>
            </div>
            {polygonMetrics.isValid ? (
              <div className="rounded-xl border bg-muted/20 p-3">
                <p className="text-xs text-muted-foreground">حدود Polygon</p>
                <p className="mt-1 font-semibold">
                  {polygonMetrics.vertexCount} نقاط — مساحة محسوبة{' '}
                  {polygonMetrics.calculatedAreaSqm.toLocaleString('ar-SA', {
                    maximumFractionDigits: 2,
                  })}{' '}
                  م²
                </p>
                <p className="mt-2 text-xs leading-6 text-muted-foreground">
                  يمكن تصدير الحدود من أعلى الصفحة بصيغ GeoJSON أو KML أو KMZ.
                </p>
              </div>
            ) : (
              <p className="text-xs leading-6 text-muted-foreground">
                لا توجد حدود Polygon محفوظة لهذه المساحة حتى الآن.
              </p>
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader><CardTitle className="flex items-center gap-2"><FileText className="h-4 w-4" /> الأصل والصك المرتبط</CardTitle></CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-3">
            <div>
              <p className="text-xs text-muted-foreground">الموقع الرئيسي</p>
              <p className="font-semibold">{area.site?.name || '-'}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">رقم الصك</p>
              <p className="font-semibold">{deed?.deedNumber || 'غير مرتبط'}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">بيان العقار</p>
              <p className="font-semibold">{deed?.propertyDescription || '-'}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BriefcaseBusiness className="h-5 w-5" />
            الفرص الاستثمارية المرتبطة
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            onClick={() =>
              navigate(
                `/investments/opportunities?areaId=${encodeURIComponent(area.id)}`
              )
            }
          >
            <BriefcaseBusiness className="me-2 h-4 w-4" />
            الفرص المرتبطة بهذه المساحة
          </Button>

          {canAddAttachment && (
            <Button
              onClick={() =>
                navigate(
                  `/investments/opportunities/new?areaId=${encodeURIComponent(area.id)}`
                )
              }
            >
              <Plus className="me-2 h-4 w-4" />
              إنشاء فرصة من هذه المساحة
            </Button>
          )}
        </CardContent>
      </Card>

      <GeometryApprovalPanel
        entityType="investment_area"
        record={area}
        canEdit={canEdit}
        canAddAttachment={canAddAttachment}
        isAdmin={isAdmin}
        onUpdated={setArea}
      />
    </div>
  );
};
