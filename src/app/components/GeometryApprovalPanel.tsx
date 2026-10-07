import React from 'react';
import {
  CheckCircle2,
  ExternalLink,
  FileCheck2,
  FilePlus2,
  LockKeyhole,
  RotateCcw,
  ShieldCheck,
} from 'lucide-react';
import { toast } from 'sonner';
import { investmentsApi } from '../../features/investments/api';
import type {
  GeometryApprovalStatus,
  InvestmentAttachmentSummary,
  InvestmentArea,
  InvestmentSite,
} from '../../features/investments/types';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { NativeSelect } from './ui/native-select';
import { Textarea } from './ui/textarea';

type GeometryRecord = InvestmentSite | InvestmentArea;

type GeometryApprovalPanelProps<T extends GeometryRecord> = {
  entityType: 'investment_site' | 'investment_area';
  record: T;
  canEdit: boolean;
  canAddAttachment: boolean;
  isAdmin: boolean;
  onUpdated: (record: T) => void;
};

const statusLabels: Record<GeometryApprovalStatus, string> = {
  DRAFT: 'مسودة',
  REVIEWED: 'تمت المراجعة',
  APPROVED: 'معتمدة',
  CHANGE_REQUESTED: 'طلب تعديل مفتوح',
};

const statusDescriptions: Record<GeometryApprovalStatus, string> = {
  DRAFT:
    'الحدود قابلة للتعديل ولم تدخل مرحلة الاعتماد الرسمي بعد.',
  REVIEWED:
    'تمت مراجعة الحدود وربطها بمرفق مرجعي، وهي بانتظار اعتماد المسؤول.',
  APPROVED:
    'الحدود معتمدة ومقفلة ضد التعديل الجغرافي حتى تسجيل طلب تعديل حدود.',
  CHANGE_REQUESTED:
    'تم تسجيل طلب تعديل للحدود المعتمدة. يمكن تعديل الحدود، وأول تغيير يعيد الدورة إلى «مسودة».',
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

export const GeometryApprovalPanel = <T extends GeometryRecord,>({
  entityType,
  record,
  canEdit,
  canAddAttachment,
  isAdmin,
  onUpdated,
}: GeometryApprovalPanelProps<T>) => {
  const [attachments, setAttachments] = React.useState<
    InvestmentAttachmentSummary[]
  >([]);
  const [selectedAttachmentId, setSelectedAttachmentId] =
    React.useState(record.geometryReferenceAttachmentId || '');
  const [note, setNote] = React.useState(record.geometryWorkflowNote || '');
  const [loadingAttachments, setLoadingAttachments] = React.useState(true);
  const [working, setWorking] = React.useState(false);
  const [attachmentTitle, setAttachmentTitle] = React.useState('');
  const [attachmentUrl, setAttachmentUrl] = React.useState('');
  const [addingAttachment, setAddingAttachment] = React.useState(false);

  React.useEffect(() => {
    setSelectedAttachmentId(record.geometryReferenceAttachmentId || '');
    setNote(record.geometryWorkflowNote || '');
  }, [
    record.geometryReferenceAttachmentId,
    record.geometryWorkflowNote,
    record.geometryApprovalStatus,
  ]);

  const loadAttachments = React.useCallback(async () => {
    try {
      setLoadingAttachments(true);
      const items = await investmentsApi.getGeometryAttachments(
        entityType,
        record.id
      );
      setAttachments(items);
    } catch (reason) {
      toast.error(
        reason instanceof Error
          ? reason.message
          : 'تعذر تحميل المرفقات المرجعية'
      );
    } finally {
      setLoadingAttachments(false);
    }
  }, [entityType, record.id]);

  React.useEffect(() => {
    loadAttachments();
  }, [loadAttachments]);

  const createAttachment = async () => {
    if (!attachmentTitle.trim()) {
      toast.error('اسم المرفق مطلوب.');
      return;
    }

    if (!attachmentUrl.trim()) {
      toast.error('رابط Google Drive للمرفق مطلوب.');
      return;
    }

    try {
      setAddingAttachment(true);
      const attachment = await investmentsApi.createGeometryAttachment({
        entityType,
        entityId: record.id,
        title: attachmentTitle.trim(),
        driveUrl: attachmentUrl.trim(),
        notes: 'مرفق مرجعي لدورة اعتماد الحدود الجغرافية',
      });

      setAttachments((current) => [attachment, ...current]);
      setSelectedAttachmentId(attachment.id);
      setAttachmentTitle('');
      setAttachmentUrl('');
      toast.success('تمت إضافة المرفق المرجعي واختياره.');
    } catch (reason) {
      toast.error(
        reason instanceof Error
          ? reason.message
          : 'تعذر إضافة المرفق المرجعي'
      );
    } finally {
      setAddingAttachment(false);
    }
  };

  const runAction = async (
    action: 'REVIEW' | 'APPROVE' | 'REQUEST_CHANGE'
  ) => {
    if (
      (action === 'REVIEW' || action === 'APPROVE') &&
      !selectedAttachmentId
    ) {
      toast.error('اختر المرفق المرجعي أولًا.');
      return;
    }

    if (action === 'REQUEST_CHANGE' && !note.trim()) {
      toast.error('سبب طلب تعديل الحدود مطلوب.');
      return;
    }

    const confirmation =
      action === 'APPROVE'
        ? 'سيتم اعتماد الحدود الجغرافية وقفل تعديل Polygon والإحداثيات ومستوى الدقة. هل تريد المتابعة؟'
        : action === 'REQUEST_CHANGE'
          ? 'سيتم فتح طلب تعديل موثق للحدود المعتمدة. هل تريد المتابعة؟'
          : 'سيتم تسجيل مراجعة الحدود وربطها بالمرفق المرجعي المختار. هل تريد المتابعة؟';

    if (!window.confirm(confirmation)) return;

    try {
      setWorking(true);

      const updated = await investmentsApi.runGeometryWorkflow<T>(
        entityType,
        record.id,
        {
          action,
          note: note.trim() || null,
          referenceAttachmentId:
            selectedAttachmentId || null,
        }
      );

      onUpdated(updated);

      toast.success(
        action === 'APPROVE'
          ? 'تم اعتماد الحدود وقفلها بنجاح.'
          : action === 'REQUEST_CHANGE'
            ? 'تم تسجيل طلب تعديل الحدود وفتحها للتعديل.'
            : 'تم تسجيل مراجعة الحدود بنجاح.'
      );
    } catch (reason) {
      toast.error(
        reason instanceof Error
          ? reason.message
          : 'تعذر تنفيذ إجراء دورة الاعتماد'
      );
    } finally {
      setWorking(false);
    }
  };

  const status =
    record.geometryApprovalStatus || 'DRAFT';
  const referenceAttachment = attachments.find(
    (attachment) =>
      attachment.id === record.geometryReferenceAttachmentId
  );

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              {status === 'APPROVED' ? (
                <LockKeyhole className="h-5 w-5" />
              ) : (
                <ShieldCheck className="h-5 w-5" />
              )}
              دورة اعتماد الحدود الجغرافية
            </CardTitle>
            <p className="mt-2 text-sm leading-7 text-muted-foreground">
              {statusDescriptions[status]}
            </p>
          </div>

          <Badge
            variant={
              status === 'APPROVED'
                ? 'secondary'
                : status === 'CHANGE_REQUESTED'
                  ? 'destructive'
                  : 'outline'
            }
          >
            {statusLabels[status]}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-5">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <div>
            <p className="text-xs text-muted-foreground">المراجع</p>
            <p className="mt-1 font-semibold">
              {record.geometryReviewedByName || '-'}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">تاريخ المراجعة</p>
            <p className="mt-1 font-semibold">
              {formatDate(record.geometryReviewedAt)}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">المعتمد بواسطة</p>
            <p className="mt-1 font-semibold">
              {record.geometryApprovedByName || '-'}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">تاريخ الاعتماد</p>
            <p className="mt-1 font-semibold">
              {formatDate(record.geometryApprovedAt)}
            </p>
          </div>
        </div>

        <div className="rounded-xl border bg-muted/20 p-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-end">
            <div className="min-w-0 flex-1 space-y-2">
              <Label htmlFor={`geometry-reference-${record.id}`}>
                المرفق المرجعي
              </Label>
              <NativeSelect
                id={`geometry-reference-${record.id}`}
                value={selectedAttachmentId}
                disabled={loadingAttachments || status === 'APPROVED'}
                onChange={(event) =>
                  setSelectedAttachmentId(event.target.value)
                }
              >
                <option value="">
                  {loadingAttachments
                    ? 'جارٍ تحميل المرفقات...'
                    : '— اختر المرفق المرجعي —'}
                </option>
                {attachments.map((attachment) => (
                  <option key={attachment.id} value={attachment.id}>
                    {attachment.title}
                  </option>
                ))}
              </NativeSelect>
            </div>

            {referenceAttachment && (
              <Button
                type="button"
                variant="outline"
                onClick={() =>
                  window.open(
                    referenceAttachment.driveUrl,
                    '_blank',
                    'noopener,noreferrer'
                  )
                }
              >
                <ExternalLink className="me-2 h-4 w-4" />
                فتح المرفق المعتمد
              </Button>
            )}
          </div>
        </div>

        {canAddAttachment &&
          status !== 'APPROVED' && (
            <div className="rounded-xl border p-4">
              <div className="mb-3 flex items-center gap-2">
                <FilePlus2 className="h-4 w-4" />
                <p className="text-sm font-semibold">
                  إضافة مرفق مرجعي جديد
                </p>
              </div>

              <div className="grid gap-3 lg:grid-cols-[minmax(220px,.7fr)_minmax(0,1.3fr)_auto]">
                <Input
                  value={attachmentTitle}
                  onChange={(event) =>
                    setAttachmentTitle(event.target.value)
                  }
                  placeholder="مثال: الرفع المساحي المعتمد"
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
                  type="button"
                  variant="outline"
                  disabled={addingAttachment}
                  onClick={createAttachment}
                >
                  <FileCheck2 className="me-2 h-4 w-4" />
                  {addingAttachment ? 'جارٍ الإضافة...' : 'إضافة واختيار'}
                </Button>
              </div>
            </div>
          )}

        <div className="space-y-2">
          <Label htmlFor={`geometry-workflow-note-${record.id}`}>
            ملاحظات دورة الاعتماد
          </Label>
          <Textarea
            id={`geometry-workflow-note-${record.id}`}
            rows={3}
            maxLength={3000}
            value={note}
            disabled={status === 'APPROVED' && !isAdmin}
            onChange={(event) => setNote(event.target.value)}
            placeholder={
              status === 'APPROVED'
                ? 'اكتب سبب طلب تعديل الحدود...'
                : 'ملاحظات المراجع أو المعتمد...'
            }
          />
        </div>

        <div className="flex flex-wrap justify-end gap-2">
          {status === 'DRAFT' && canEdit && (
            <Button
              type="button"
              disabled={working}
              onClick={() => runAction('REVIEW')}
            >
              <CheckCircle2 className="me-2 h-4 w-4" />
              تسجيل اكتمال المراجعة
            </Button>
          )}

          {status === 'REVIEWED' && isAdmin && (
            <Button
              type="button"
              disabled={working}
              onClick={() => runAction('APPROVE')}
            >
              <LockKeyhole className="me-2 h-4 w-4" />
              اعتماد الحدود وقفلها
            </Button>
          )}

          {status === 'APPROVED' && isAdmin && (
            <Button
              type="button"
              variant="destructive"
              disabled={working}
              onClick={() => runAction('REQUEST_CHANGE')}
            >
              <RotateCcw className="me-2 h-4 w-4" />
              طلب تعديل حدود
            </Button>
          )}
        </div>

        {status === 'CHANGE_REQUESTED' && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm leading-7 text-amber-950">
            طلب التعديل موثق ومفتوح. يمكن تعديل الحدود الآن، وعند حفظ أي تغيير
            جغرافي يعيد النظام الحالة تلقائيًا إلى «مسودة» ويلزم المرور بالمراجعة
            والاعتماد من جديد.
          </div>
        )}
      </CardContent>
    </Card>
  );
};
