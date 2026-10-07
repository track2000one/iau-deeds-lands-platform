import React from 'react';
import {
  ArrowRight,
  BriefcaseBusiness,
  CheckCircle2,
  Clock3,
  Edit3,
  ExternalLink,
  FilePlus2,
  History,
  Landmark,
  MapPin,
  RefreshCw,
  Send,
  ShieldCheck,
  XCircle,
} from 'lucide-react';
import { useNavigate, useParams } from 'react-router';
import { toast } from 'sonner';
import { usePermissions } from '../../context/PermissionsContext';
import { investmentsApi } from '../../features/investments/api';
import type {
  InvestmentAttachmentSummary,
  InvestmentOpportunity,
  InvestmentOpportunityStatus,
} from '../../features/investments/types';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';

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

const statusDescriptions: Record<InvestmentOpportunityStatus, string> = {
  IDENTIFIED: 'تم تعريف الفرصة وربطها بالمساحة الاستثمارية.',
  UNDER_STUDY: 'الفرصة قيد إعداد الدراسة واستكمال عناصرها.',
  PENDING_APPROVAL: 'تم رفع الفرصة للموافقة الإدارية.',
  APPROVED: 'تم اعتماد الفرصة ويمكن تجهيزها للطرح.',
  OFFERED: 'الفرصة مطروحة للاستثمار.',
  NEGOTIATION: 'الفرصة في مرحلة التفاوض.',
  INVESTED: 'تم الوصول إلى مرحلة الاستثمار.',
  REJECTED: 'تم رفض الفرصة ويمكن إعادتها للدراسة عند الحاجة.',
  CANCELLED: 'تم إلغاء الفرصة.',
};

const statusVariant = (
  status: InvestmentOpportunityStatus
): 'default' | 'secondary' | 'destructive' | 'outline' => {
  if (status === 'INVESTED') return 'secondary';
  if (status === 'REJECTED' || status === 'CANCELLED') return 'destructive';
  if (status === 'PENDING_APPROVAL' || status === 'APPROVED') return 'default';
  return 'outline';
};

const transitionLabels: Partial<Record<InvestmentOpportunityStatus, string>> = {
  UNDER_STUDY: 'بدء / إعادة الدراسة',
  PENDING_APPROVAL: 'إحالة للموافقة',
  APPROVED: 'اعتماد الفرصة',
  OFFERED: 'تحويل إلى مطروحة',
  NEGOTIATION: 'بدء التفاوض',
  INVESTED: 'تسجيل كمستثمرة',
  REJECTED: 'رفض الفرصة',
  CANCELLED: 'إلغاء الفرصة',
};

const allowedTransitions: Record<
  InvestmentOpportunityStatus,
  InvestmentOpportunityStatus[]
> = {
  IDENTIFIED: ['UNDER_STUDY', 'CANCELLED'],
  UNDER_STUDY: ['PENDING_APPROVAL', 'CANCELLED'],
  PENDING_APPROVAL: ['APPROVED', 'REJECTED', 'UNDER_STUDY', 'CANCELLED'],
  APPROVED: ['OFFERED', 'CANCELLED'],
  OFFERED: ['NEGOTIATION', 'CANCELLED'],
  NEGOTIATION: ['INVESTED', 'OFFERED', 'CANCELLED'],
  REJECTED: ['UNDER_STUDY', 'CANCELLED'],
  INVESTED: [],
  CANCELLED: [],
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

const formatCurrency = (
  value?: number | string | null,
  currency = 'SAR'
) => {
  if (value == null || value === '') return '-';

  return new Intl.NumberFormat('ar-SA', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(Number(value));
};

export const InvestmentOpportunityDetailsPage: React.FC = () => {
  const navigate = useNavigate();
  const { opportunityId } = useParams();
  const { hasPermission, isAdmin } = usePermissions();

  const canEdit = isAdmin || hasPermission('investments', 'canEdit');
  const canAddAttachment =
    isAdmin || hasPermission('investments', 'canAdd');

  const [opportunity, setOpportunity] =
    React.useState<InvestmentOpportunity | null>(null);
  const [attachments, setAttachments] = React.useState<
    InvestmentAttachmentSummary[]
  >([]);
  const [loading, setLoading] = React.useState(true);
  const [transitioning, setTransitioning] =
    React.useState<InvestmentOpportunityStatus | null>(null);
  const [workflowNote, setWorkflowNote] = React.useState('');
  const [attachmentTitle, setAttachmentTitle] = React.useState('');
  const [attachmentUrl, setAttachmentUrl] = React.useState('');
  const [addingAttachment, setAddingAttachment] = React.useState(false);

  const load = React.useCallback(async () => {
    if (!opportunityId) return;

    try {
      setLoading(true);
      const [record, attachmentItems] = await Promise.all([
        investmentsApi.getOpportunity(opportunityId),
        investmentsApi.getOpportunityAttachments(opportunityId),
      ]);

      setOpportunity(record);
      setAttachments(attachmentItems);
    } catch (reason) {
      toast.error(
        reason instanceof Error
          ? reason.message
          : 'تعذر تحميل الفرصة الاستثمارية'
      );
    } finally {
      setLoading(false);
    }
  }, [opportunityId]);

  React.useEffect(() => {
    load();
  }, [load]);

  const transition = async (
    toStatus: InvestmentOpportunityStatus
  ) => {
    if (!opportunity) return;

    const requiresAdmin =
      toStatus === 'APPROVED' || toStatus === 'REJECTED';
    if (requiresAdmin && !isAdmin) {
      toast.error('هذا الإجراء متاح للمسؤول فقط.');
      return;
    }

    if (
      (toStatus === 'REJECTED' || toStatus === 'CANCELLED') &&
      !workflowNote.trim()
    ) {
      toast.error('اكتب سبب الرفض أو الإلغاء قبل تنفيذ الإجراء.');
      return;
    }

    const confirmation =
      toStatus === 'APPROVED'
        ? 'سيتم اعتماد الفرصة رسميًا. هل تريد المتابعة؟'
        : toStatus === 'INVESTED'
          ? 'سيتم تسجيل الفرصة كمستثمرة وإغلاق دورة حالتها. هل تريد المتابعة؟'
          : toStatus === 'CANCELLED'
            ? 'سيتم إلغاء الفرصة. هل تريد المتابعة؟'
            : `سيتم تغيير حالة الفرصة إلى «${statusLabels[toStatus]}». هل تريد المتابعة؟`;

    if (!window.confirm(confirmation)) return;

    try {
      setTransitioning(toStatus);

      const updated =
        await investmentsApi.transitionOpportunity(
          opportunity.id,
          {
            toStatus,
            note: workflowNote.trim() || null,
          }
        );

      setOpportunity(updated);
      setWorkflowNote('');
      toast.success(
        `تم تحديث حالة الفرصة إلى «${statusLabels[toStatus]}».`
      );
    } catch (reason) {
      toast.error(
        reason instanceof Error
          ? reason.message
          : 'تعذر تحديث حالة الفرصة'
      );
    } finally {
      setTransitioning(null);
    }
  };

  const addAttachment = async () => {
    if (!opportunity) return;

    if (!attachmentTitle.trim()) {
      toast.error('اسم المرفق مطلوب.');
      return;
    }

    if (!attachmentUrl.trim()) {
      toast.error('رابط Google Drive مطلوب.');
      return;
    }

    try {
      setAddingAttachment(true);

      const created =
        await investmentsApi.createOpportunityAttachment({
          entityId: opportunity.id,
          title: attachmentTitle.trim(),
          driveUrl: attachmentUrl.trim(),
          notes: 'مرفق مرتبط بالفرصة الاستثمارية',
        });

      setAttachments((current) => [created, ...current]);
      setAttachmentTitle('');
      setAttachmentUrl('');
      toast.success('تمت إضافة المرفق.');
    } catch (reason) {
      toast.error(
        reason instanceof Error
          ? reason.message
          : 'تعذر إضافة المرفق'
      );
    } finally {
      setAddingAttachment(false);
    }
  };

  if (loading) {
    return (
      <div className="p-10 text-center text-sm text-muted-foreground">
        جارٍ تحميل الفرصة الاستثمارية...
      </div>
    );
  }

  if (!opportunity) {
    return (
      <div className="p-10 text-center text-sm text-muted-foreground">
        الفرصة الاستثمارية غير موجودة.
      </div>
    );
  }

  const area = opportunity.area;
  const site = area?.site;
  const terminal =
    opportunity.status === 'INVESTED' ||
    opportunity.status === 'CANCELLED';

  const transitions = allowedTransitions[opportunity.status].filter(
    (target) => {
      if (
        (target === 'APPROVED' || target === 'REJECTED') &&
        !isAdmin
      ) {
        return false;
      }

      return canEdit;
    }
  );

  const durationYears =
    opportunity.durationMonths &&
    opportunity.durationMonths >= 12
      ? opportunity.durationMonths / 12
      : null;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
        <div>
          <Button
            variant="ghost"
            className="mb-2 px-0"
            onClick={() => navigate('/investments/opportunities')}
          >
            <ArrowRight className="me-2 h-4 w-4" />
            الفرص الاستثمارية
          </Button>

          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-bold">
              {opportunity.title}
            </h1>
            <Badge variant={statusVariant(opportunity.status)}>
              {statusLabels[opportunity.status]}
            </Badge>
          </div>

          <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            <span dir="ltr">{opportunity.opportunityNumber}</span>
            <span>•</span>
            <span>{statusDescriptions[opportunity.status]}</span>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {canEdit && !terminal && (
            <Button
              variant="outline"
              onClick={() =>
                navigate(
                  `/investments/opportunities/${opportunity.id}/edit`
                )
              }
            >
              <Edit3 className="me-2 h-4 w-4" />
              تعديل البيانات
            </Button>
          )}

          <Button variant="outline" onClick={load}>
            <RefreshCw className="me-2 h-4 w-4" />
            تحديث
          </Button>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">المساحة المخصصة</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold">
              {opportunity.allocatedArea == null
                ? '-'
                : `${Number(
                    opportunity.allocatedArea
                  ).toLocaleString('ar-SA', {
                    maximumFractionDigits: 2,
                  })} م²`}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">مدة الاستثمار</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold">
              {opportunity.durationMonths == null
                ? '-'
                : `${opportunity.durationMonths} شهر`}
            </div>
            {durationYears != null && (
              <p className="mt-1 text-xs text-muted-foreground">
                ≈ {durationYears.toLocaleString('ar-SA', {
                  maximumFractionDigits: 1,
                })}{' '}
                سنة
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">القيمة التقديرية</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold">
              {formatCurrency(
                opportunity.estimatedValue,
                opportunity.currency
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">آخر تغيير للحالة</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-sm font-semibold">
              {formatDate(opportunity.statusChangedAt)}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-5 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <BriefcaseBusiness className="h-5 w-5" />
              بيانات الفرصة
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-xs text-muted-foreground">
                الاستخدام الاستثماري
              </p>
              <p className="mt-1 font-semibold">
                {opportunity.investmentUse || 'غير محدد'}
              </p>
            </div>

            <div>
              <p className="text-xs text-muted-foreground">
                وصف المشروع
              </p>
              <p className="mt-1 whitespace-pre-wrap leading-7">
                {opportunity.projectDescription || 'غير محدد'}
              </p>
            </div>

            <div>
              <p className="text-xs text-muted-foreground">
                ملاحظات
              </p>
              <p className="mt-1 whitespace-pre-wrap leading-7">
                {opportunity.notes || 'لا توجد ملاحظات'}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <MapPin className="h-5 w-5" />
              المساحة الأصلية
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-xs text-muted-foreground">
                الموقع الرئيسي
              </p>
              <p className="mt-1 font-semibold">
                {site?.name || '-'}
              </p>
            </div>

            <div>
              <p className="text-xs text-muted-foreground">
                المساحة الاستثمارية
              </p>
              <div className="mt-1 flex flex-wrap items-center gap-2">
                <p className="font-semibold" dir="ltr">
                  {area?.areaCode || '-'}
                </p>
                {area && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() =>
                      navigate(
                        `/investments/areas/${area.id}`
                      )
                    }
                  >
                    فتح المساحة
                  </Button>
                )}
              </div>
            </div>

            <div>
              <p className="text-xs text-muted-foreground">
                الاستخدام المقترح في سجل المساحة
              </p>
              <p className="mt-1 font-semibold">
                {area?.proposedUse || '-'}
              </p>
            </div>

            <div>
              <p className="text-xs text-muted-foreground">
                المساحة المساحية
              </p>
              <p className="mt-1 font-semibold">
                {area?.surveyedArea == null
                  ? '-'
                  : `${Number(
                      area.surveyedArea
                    ).toLocaleString('ar-SA', {
                      maximumFractionDigits: 2,
                    })} م²`}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <ShieldCheck className="h-5 w-5" />
            إجراءات دورة حياة الفرصة
          </CardTitle>
        </CardHeader>

        <CardContent className="space-y-4">
          {transitions.length > 0 ? (
            <>
              <div className="space-y-2">
                <Label htmlFor="workflowNote">
                  ملاحظة الإجراء
                </Label>
                <Textarea
                  id="workflowNote"
                  rows={3}
                  maxLength={3000}
                  value={workflowNote}
                  onChange={(event) =>
                    setWorkflowNote(event.target.value)
                  }
                  placeholder="مطلوبة عند الرفض أو الإلغاء، واختيارية لبقية الإجراءات."
                />
              </div>

              <div className="flex flex-wrap gap-2">
                {transitions.map((target) => (
                  <Button
                    key={target}
                    variant={
                      target === 'REJECTED' ||
                      target === 'CANCELLED'
                        ? 'destructive'
                        : target === 'APPROVED' ||
                            target === 'INVESTED'
                          ? 'default'
                          : 'outline'
                    }
                    disabled={Boolean(transitioning)}
                    onClick={() => transition(target)}
                  >
                    {target === 'APPROVED' ||
                    target === 'INVESTED' ? (
                      <CheckCircle2 className="me-2 h-4 w-4" />
                    ) : target === 'PENDING_APPROVAL' ? (
                      <Send className="me-2 h-4 w-4" />
                    ) : target === 'REJECTED' ||
                      target === 'CANCELLED' ? (
                      <XCircle className="me-2 h-4 w-4" />
                    ) : (
                      <Clock3 className="me-2 h-4 w-4" />
                    )}
                    {transitioning === target
                      ? 'جارٍ التنفيذ...'
                      : transitionLabels[target] ||
                        statusLabels[target]}
                  </Button>
                ))}
              </div>
            </>
          ) : (
            <div className="rounded-xl border bg-muted/20 p-4 text-sm leading-7 text-muted-foreground">
              لا توجد إجراءات حالة متاحة لهذا السجل وفق الصلاحية والحالة
              الحالية.
            </div>
          )}

          {opportunity.status === 'PENDING_APPROVAL' && !isAdmin && (
            <p className="text-xs text-muted-foreground">
              الاعتماد أو الرفض النهائي متاح للمسؤول فقط.
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Landmark className="h-5 w-5" />
            المرفقات
          </CardTitle>
        </CardHeader>

        <CardContent className="space-y-4">
          {canAddAttachment && (
            <div className="grid gap-3 rounded-xl border p-4 lg:grid-cols-[minmax(220px,.7fr)_minmax(0,1.3fr)_auto]">
              <Input
                value={attachmentTitle}
                onChange={(event) =>
                  setAttachmentTitle(event.target.value)
                }
                placeholder="اسم المرفق"
              />
              <Input
                dir="ltr"
                value={attachmentUrl}
                onChange={(event) =>
                  setAttachmentUrl(event.target.value)
                }
                placeholder="https://drive.google.com/..."
              />
              <Button
                variant="outline"
                disabled={addingAttachment}
                onClick={addAttachment}
              >
                <FilePlus2 className="me-2 h-4 w-4" />
                {addingAttachment ? 'جارٍ الإضافة...' : 'إضافة مرفق'}
              </Button>
            </div>
          )}

          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {attachments.map((attachment) => (
              <div
                key={attachment.id}
                className="rounded-xl border p-4"
              >
                <p className="font-semibold">{attachment.title}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {formatDate(attachment.createdAt)}
                </p>
                <Button
                  className="mt-3"
                  size="sm"
                  variant="ghost"
                  onClick={() =>
                    window.open(
                      attachment.driveUrl,
                      '_blank',
                      'noopener,noreferrer'
                    )
                  }
                >
                  <ExternalLink className="me-1 h-4 w-4" />
                  فتح المرفق
                </Button>
              </div>
            ))}
          </div>

          {attachments.length === 0 && (
            <p className="text-sm text-muted-foreground">
              لا توجد مرفقات مرتبطة بالفرصة حتى الآن.
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <History className="h-5 w-5" />
            السجل الزمني
          </CardTitle>
        </CardHeader>

        <CardContent className="space-y-3">
          {(opportunity.events || []).map((event) => (
            <div
              key={event.id}
              className="rounded-xl border p-4"
            >
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="outline">
                    {event.fromStatus
                      ? statusLabels[event.fromStatus]
                      : 'إنشاء'}
                  </Badge>
                  <ArrowRight className="h-4 w-4 text-muted-foreground" />
                  <Badge variant={statusVariant(event.toStatus)}>
                    {statusLabels[event.toStatus]}
                  </Badge>
                </div>

                <span className="text-xs text-muted-foreground">
                  {formatDate(event.createdAt)}
                </span>
              </div>

              <p className="mt-2 text-sm">
                بواسطة: {event.changedByName || 'غير محدد'}
              </p>

              {event.note && (
                <p className="mt-2 whitespace-pre-wrap text-sm leading-7 text-muted-foreground">
                  {event.note}
                </p>
              )}
            </div>
          ))}

          {(opportunity.events || []).length === 0 && (
            <p className="text-sm text-muted-foreground">
              لا توجد أحداث مسجلة.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
