import React from 'react';
import {
  ArrowRight,
  BriefcaseBusiness,
  Save,
  ShieldCheck,
} from 'lucide-react';
import { useNavigate, useParams, useSearchParams } from 'react-router';
import { toast } from 'sonner';
import { investmentsApi } from '../../features/investments/api';
import type {
  EligibleInvestmentArea,
  InvestmentOpportunityInput,
  InvestmentOpportunityStatus,
} from '../../features/investments/types';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { NativeSelect } from '../components/ui/native-select';
import { Textarea } from '../components/ui/textarea';

type FormState = {
  areaId: string;
  title: string;
  investmentUse: string;
  projectDescription: string;
  allocatedArea: string;
  durationMonths: string;
  estimatedValue: string;
  currency: string;
  notes: string;
};

const EMPTY_FORM: FormState = {
  areaId: '',
  title: '',
  investmentUse: '',
  projectDescription: '',
  allocatedArea: '',
  durationMonths: '',
  estimatedValue: '',
  currency: 'SAR',
  notes: '',
};

const blockerLabels: Record<string, string> = {
  MISSING_DEED: 'ربط الصك',
  MISSING_SITE_BOUNDARY: 'حدود الموقع الرئيسي',
  SITE_BOUNDARY_NOT_APPROVED: 'اعتماد حدود الموقع الرئيسي',
  AREA_NOT_AVAILABLE: 'إتاحة المساحة',
  READINESS_NOT_READY: 'جاهزية الاستثمار',
  MISSING_AREA_BOUNDARY: 'حدود المساحة',
  AREA_BOUNDARY_NOT_APPROVED: 'اعتماد حدود المساحة',
  MISSING_SURVEYED_AREA: 'المساحة المساحية',
  MISSING_PROPOSED_USE: 'الاستخدام المقترح',
  ACTIVE_OPPORTUNITY_EXISTS: 'توجد فرصة نشطة',
};

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

export const InvestmentOpportunityFormPage: React.FC = () => {
  const navigate = useNavigate();
  const { opportunityId } = useParams();
  const [searchParams] = useSearchParams();
  const isEdit = Boolean(opportunityId);

  const [form, setForm] = React.useState<FormState>(EMPTY_FORM);
  const [eligibleAreas, setEligibleAreas] = React.useState<
    EligibleInvestmentArea[]
  >([]);
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [currentStatus, setCurrentStatus] =
    React.useState<InvestmentOpportunityStatus>('IDENTIFIED');
  const [opportunityNumber, setOpportunityNumber] = React.useState('');

  const setField = <K extends keyof FormState>(
    key: K,
    value: FormState[K]
  ) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  React.useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        setLoading(true);

        if (isEdit && opportunityId) {
          const opportunity = await investmentsApi.getOpportunity(
            opportunityId
          );

          if (cancelled) return;

          setCurrentStatus(opportunity.status);
          setOpportunityNumber(opportunity.opportunityNumber);
          setForm({
            areaId: opportunity.areaId,
            title: opportunity.title,
            investmentUse: opportunity.investmentUse || '',
            projectDescription: opportunity.projectDescription || '',
            allocatedArea:
              opportunity.allocatedArea == null
                ? ''
                : String(opportunity.allocatedArea),
            durationMonths:
              opportunity.durationMonths == null
                ? ''
                : String(opportunity.durationMonths),
            estimatedValue:
              opportunity.estimatedValue == null
                ? ''
                : String(opportunity.estimatedValue),
            currency: opportunity.currency || 'SAR',
            notes: opportunity.notes || '',
          });

          const area = opportunity.area;
          if (area) {
            setEligibleAreas([
              {
                id: area.id,
                areaCode: area.areaCode,
                name: area.name,
                surveyedArea: area.surveyedArea,
                approximateArea: area.approximateArea,
                proposedUse: area.proposedUse,
                site: {
                  id: area.site?.id || '',
                  code: area.site?.code || '',
                  name: area.site?.name || '-',
                },
                eligible: true,
                blockers: [],
                activeOpportunity: {
                  id: opportunity.id,
                  opportunityNumber: opportunity.opportunityNumber,
                  status: opportunity.status,
                },
              },
            ]);
          }

          return;
        }

        const response =
          await investmentsApi.getEligibleOpportunityAreas();

        if (cancelled) return;

        setEligibleAreas(response.items);

        const requestedAreaId = searchParams.get('areaId');
        const initialArea = requestedAreaId
          ? response.items.find(
              (item) =>
                item.id === requestedAreaId &&
                item.eligible
            )
          : response.items.find((item) => item.eligible);

        if (initialArea) {
          setForm((current) => ({
            ...current,
            areaId: initialArea.id,
            investmentUse:
              current.investmentUse ||
              initialArea.proposedUse ||
              '',
            allocatedArea:
              current.allocatedArea ||
              String(
                Number(initialArea.surveyedArea || 0) ||
                  Number(initialArea.approximateArea || 0) ||
                  ''
              ),
            title:
              current.title ||
              `فرصة استثمارية - ${initialArea.areaCode}`,
          }));
        }
      } catch (reason) {
        toast.error(
          reason instanceof Error
            ? reason.message
            : 'تعذر تحميل نموذج الفرصة الاستثمارية'
        );
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();

    return () => {
      cancelled = true;
    };
  }, [isEdit, opportunityId, searchParams]);

  const selectedArea = eligibleAreas.find(
    (item) => item.id === form.areaId
  );

  const activeEligibleAreas = eligibleAreas.filter(
    (item) => item.eligible
  );

  const areaReference =
    Number(selectedArea?.surveyedArea || 0) ||
    Number(selectedArea?.approximateArea || 0);

  const terminal =
    currentStatus === 'INVESTED' ||
    currentStatus === 'CANCELLED';

  const handleAreaChange = (areaId: string) => {
    const area = eligibleAreas.find((item) => item.id === areaId);

    setForm((current) => ({
      ...current,
      areaId,
      investmentUse: area?.proposedUse || current.investmentUse,
      allocatedArea:
        area == null
          ? current.allocatedArea
          : String(
              Number(area.surveyedArea || 0) ||
                Number(area.approximateArea || 0) ||
                ''
            ),
      title:
        area && !current.title.trim()
          ? `فرصة استثمارية - ${area.areaCode}`
          : current.title,
    }));
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!isEdit && !form.areaId) {
      toast.error('اختر مساحة استثمارية مؤهلة.');
      return;
    }

    if (!form.title.trim()) {
      toast.error('اسم الفرصة الاستثمارية مطلوب.');
      return;
    }

    const allocatedArea = form.allocatedArea.trim()
      ? Number(form.allocatedArea)
      : null;
    const durationMonths = form.durationMonths.trim()
      ? Number(form.durationMonths)
      : null;
    const estimatedValue = form.estimatedValue.trim()
      ? Number(form.estimatedValue)
      : null;

    if (
      allocatedArea != null &&
      (!Number.isFinite(allocatedArea) || allocatedArea <= 0)
    ) {
      toast.error('المساحة المخصصة يجب أن تكون رقمًا أكبر من صفر.');
      return;
    }

    if (
      areaReference > 0 &&
      allocatedArea != null &&
      allocatedArea > areaReference
    ) {
      toast.error(
        'المساحة المخصصة لا يمكن أن تتجاوز مساحة السجل المرجعية.'
      );
      return;
    }

    if (
      durationMonths != null &&
      (!Number.isInteger(durationMonths) ||
        durationMonths <= 0)
    ) {
      toast.error('مدة الاستثمار بالأشهر يجب أن تكون عددًا صحيحًا موجبًا.');
      return;
    }

    if (
      estimatedValue != null &&
      (!Number.isFinite(estimatedValue) ||
        estimatedValue < 0)
    ) {
      toast.error('القيمة التقديرية غير صحيحة.');
      return;
    }

    const input: InvestmentOpportunityInput = {
      areaId: form.areaId,
      title: form.title.trim(),
      investmentUse: form.investmentUse.trim() || null,
      projectDescription:
        form.projectDescription.trim() || null,
      allocatedArea,
      durationMonths,
      estimatedValue,
      currency: form.currency.trim() || 'SAR',
      notes: form.notes.trim() || null,
    };

    try {
      setSaving(true);

      if (isEdit && opportunityId) {
        const { areaId: _ignored, ...changes } = input;
        const updated =
          await investmentsApi.updateOpportunity(
            opportunityId,
            changes
          );

        toast.success('تم تحديث بيانات الفرصة الاستثمارية.');
        navigate(
          `/investments/opportunities/${updated.id}`,
          { replace: true }
        );
      } else {
        const created =
          await investmentsApi.createOpportunity(input);

        toast.success(
          `تم إنشاء الفرصة ${created.opportunityNumber} بنجاح.`
        );
        navigate(
          `/investments/opportunities/${created.id}`,
          { replace: true }
        );
      }
    } catch (reason: any) {
      if (
        reason &&
        typeof reason === 'object' &&
        Array.isArray(reason.blockers)
      ) {
        toast.error(
          reason.blockers
            .map((item: any) => item.label)
            .join('، ')
        );
      } else {
        toast.error(
          reason instanceof Error
            ? reason.message
            : 'تعذر حفظ الفرصة الاستثمارية'
        );
      }
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="p-10 text-center text-sm text-muted-foreground">
        جارٍ تحميل نموذج الفرصة...
      </div>
    );
  }

  return (
    <form className="space-y-6" onSubmit={handleSubmit}>
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <Button
            type="button"
            variant="ghost"
            className="mb-2 px-0"
            onClick={() =>
              navigate(
                isEdit && opportunityId
                  ? `/investments/opportunities/${opportunityId}`
                  : '/investments/opportunities'
              )
            }
          >
            <ArrowRight className="me-2 h-4 w-4" />
            {isEdit ? 'تفاصيل الفرصة' : 'الفرص الاستثمارية'}
          </Button>

          <h1 className="text-2xl font-bold">
            {isEdit ? 'تعديل الفرصة الاستثمارية' : 'إنشاء فرصة استثمارية'}
          </h1>

          {isEdit && (
            <div className="mt-2 flex flex-wrap gap-2">
              <Badge variant="outline" dir="ltr">
                {opportunityNumber}
              </Badge>
              <Badge variant="secondary">
                {statusLabels[currentStatus]}
              </Badge>
            </div>
          )}
        </div>
      </div>

      {!isEdit && activeEligibleAreas.length === 0 && (
        <Card className="border-amber-200 bg-amber-50/60">
          <CardContent className="flex items-start gap-3 p-5 text-sm leading-7 text-amber-950">
            <ShieldCheck className="mt-1 h-5 w-5 shrink-0" />
            <div>
              <p className="font-semibold">
                لا توجد مساحة مستوفية لبوابة إنشاء الفرص حاليًا
              </p>
              <p>
                يجب استكمال ربط الصك، واعتماد حدود الموقع والمساحة، وحالة
                الإتاحة، وجاهزية الاستثمار، والمساحة المساحية والاستخدام
                المقترح قبل إنشاء فرصة فعلية.
              </p>
              <Button
                type="button"
                className="mt-3"
                variant="outline"
                onClick={() => navigate('/investments/executive')}
              >
                فتح لوحة المؤشرات التنفيذية
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <BriefcaseBusiness className="h-5 w-5" />
            أولًا: المساحة والبيانات الأساسية
          </CardTitle>
        </CardHeader>

        <CardContent className="grid gap-4 lg:grid-cols-2">
          <div className="space-y-2 lg:col-span-2">
            <Label htmlFor="areaId">المساحة الاستثمارية *</Label>
            <NativeSelect
              id="areaId"
              value={form.areaId}
              disabled={isEdit}
              onChange={(event) =>
                handleAreaChange(event.target.value)
              }
            >
              <option value="">— اختر مساحة مؤهلة —</option>
              {(isEdit ? eligibleAreas : activeEligibleAreas).map(
                (area) => (
                  <option key={area.id} value={area.id}>
                    {area.site.name} — {area.areaCode}
                  </option>
                )
              )}
            </NativeSelect>
          </div>

          {selectedArea && (
            <div className="lg:col-span-2 rounded-xl border bg-muted/20 p-4">
              <div className="grid gap-3 sm:grid-cols-3">
                <div>
                  <p className="text-xs text-muted-foreground">
                    الموقع الرئيسي
                  </p>
                  <p className="mt-1 font-semibold">
                    {selectedArea.site.name}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">
                    رمز المساحة
                  </p>
                  <p className="mt-1 font-semibold" dir="ltr">
                    {selectedArea.areaCode}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">
                    المساحة المرجعية
                  </p>
                  <p className="mt-1 font-semibold">
                    {areaReference > 0
                      ? `${areaReference.toLocaleString('ar-SA', {
                          maximumFractionDigits: 2,
                        })} م²`
                      : '-'}
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="space-y-2 lg:col-span-2">
            <Label htmlFor="title">اسم الفرصة *</Label>
            <Input
              id="title"
              value={form.title}
              disabled={terminal}
              onChange={(event) =>
                setField('title', event.target.value)
              }
              placeholder="مثال: تطوير وتشغيل خدمات تجارية"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="investmentUse">الاستخدام الاستثماري</Label>
            <Input
              id="investmentUse"
              value={form.investmentUse}
              disabled={terminal}
              onChange={(event) =>
                setField('investmentUse', event.target.value)
              }
              placeholder="تجاري، صحي، تعليمي، خدمي..."
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="allocatedArea">المساحة المخصصة م²</Label>
            <Input
              id="allocatedArea"
              type="number"
              min="0"
              step="0.01"
              value={form.allocatedArea}
              disabled={terminal}
              onChange={(event) =>
                setField('allocatedArea', event.target.value)
              }
            />
          </div>

          <div className="space-y-2 lg:col-span-2">
            <Label htmlFor="projectDescription">وصف المشروع</Label>
            <Textarea
              id="projectDescription"
              rows={5}
              value={form.projectDescription}
              disabled={terminal}
              onChange={(event) =>
                setField(
                  'projectDescription',
                  event.target.value
                )
              }
              placeholder="وصف موجز لنطاق المشروع والخدمات أو الأنشطة المقترحة..."
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            ثانيًا: المدة والقيمة التقديرية
          </CardTitle>
        </CardHeader>

        <CardContent className="grid gap-4 lg:grid-cols-3">
          <div className="space-y-2">
            <Label htmlFor="durationMonths">
              مدة الاستثمار بالأشهر
            </Label>
            <Input
              id="durationMonths"
              type="number"
              min="1"
              max="1200"
              step="1"
              value={form.durationMonths}
              disabled={terminal}
              onChange={(event) =>
                setField('durationMonths', event.target.value)
              }
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="estimatedValue">القيمة التقديرية</Label>
            <Input
              id="estimatedValue"
              type="number"
              min="0"
              step="0.01"
              value={form.estimatedValue}
              disabled={terminal}
              onChange={(event) =>
                setField('estimatedValue', event.target.value)
              }
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="currency">العملة</Label>
            <NativeSelect
              id="currency"
              value={form.currency}
              disabled={terminal}
              onChange={(event) =>
                setField('currency', event.target.value)
              }
            >
              <option value="SAR">ريال سعودي — SAR</option>
            </NativeSelect>
          </div>

          <div className="space-y-2 lg:col-span-3">
            <Label htmlFor="notes">ملاحظات</Label>
            <Textarea
              id="notes"
              rows={4}
              value={form.notes}
              disabled={terminal}
              onChange={(event) =>
                setField('notes', event.target.value)
              }
            />
          </div>
        </CardContent>
      </Card>

      <Card className="border-sky-200 bg-sky-50/50">
        <CardContent className="p-4 text-sm leading-7 text-sky-950">
          <p className="font-semibold">ضبط دورة الفرصة</p>
          <p>
            يمكن إنشاء الفرصة ببيانات أولية، لكن النظام لن يسمح بإحالتها إلى
            «بانتظار الموافقة» حتى يكتمل الاستخدام الاستثماري، وصف المشروع،
            المساحة المخصصة، مدة الاستثمار والقيمة التقديرية.
          </p>
        </CardContent>
      </Card>

      <div className="flex justify-end gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={() => navigate(-1)}
        >
          إلغاء
        </Button>
        <Button
          type="submit"
          disabled={
            saving ||
            terminal ||
            (!isEdit && activeEligibleAreas.length === 0)
          }
        >
          <Save className="me-2 h-4 w-4" />
          {saving
            ? 'جارٍ الحفظ...'
            : isEdit
              ? 'حفظ التعديلات'
              : 'إنشاء الفرصة'}
        </Button>
      </div>
    </form>
  );
};
