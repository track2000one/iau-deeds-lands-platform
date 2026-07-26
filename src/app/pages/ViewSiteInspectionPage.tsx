import React from 'react';
import { useNavigate, useParams } from 'react-router';
import {
  ArrowRight,
  Edit,
  ExternalLink,
  FileText,
  MapPin,
  Printer,
} from 'lucide-react';
import { toast } from 'sonner';
import { usePermissions } from '../../context/PermissionsContext';
import type { SiteInspection } from '../../types/siteInspection';
import { getSiteInspection } from '../api/siteInspections';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';

const labels: Record<string, string> = {
  excellent: 'ممتازة',
  good: 'جيدة',
  follow_up: 'تحتاج متابعة',
  maintenance: 'تحتاج صيانة',
  major_notes: 'ملاحظات جوهرية',
  emergency: 'حالة طارئة',
  new: 'جديدة',
  under_review: 'قيد المراجعة',
  referred: 'تمت الإحالة',
  in_progress: 'جارٍ التنفيذ',
  resolved: 'تمت المعالجة',
  closed: 'مغلقة',
  low: 'منخفضة',
  normal: 'عادية',
  high: 'عالية',
  urgent: 'عاجلة',
  land: 'أرض',
  building: 'مبنى',
  facility: 'مرفق',
  general_site: 'موقع عام',
  other: 'أخرى',
};


const extractGoogleDriveFileId = (attachment: {
  driveFileId?: string | null;
  driveUrl: string;
}): string | null => {
  if (attachment.driveFileId) return attachment.driveFileId;

  const patterns = [
    /\/file\/d\/([^/]+)/,
    /[?&]id=([^&]+)/,
    /\/d\/([^/]+)/,
  ];

  for (const pattern of patterns) {
    const match = attachment.driveUrl.match(pattern);
    if (match?.[1]) return decodeURIComponent(match[1]);
  }

  return null;
};

const getAttachmentPreviewUrl = (attachment: {
  driveFileId?: string | null;
  driveUrl: string;
  mimeType?: string | null;
}): string => {
  const fileId = extractGoogleDriveFileId(attachment);

  if (!fileId) return attachment.driveUrl;

  if (attachment.mimeType === 'application/pdf') {
    return `https://drive.google.com/file/d/${fileId}/preview`;
  }

  return `https://drive.google.com/thumbnail?id=${fileId}&sz=w1600`;
};

const isPdfAttachment = (attachment: {
  mimeType?: string | null;
  title: string;
}): boolean =>
  attachment.mimeType === 'application/pdf' ||
  attachment.title.toLowerCase().endsWith('.pdf');

export const ViewSiteInspectionPage: React.FC = () => {
  const { inspectionId } = useParams();
  const navigate = useNavigate();
  const { isAdmin, hasPermission } = usePermissions();
  const [record, setRecord] = React.useState<SiteInspection | null>(null);

  React.useEffect(() => {
    if (!inspectionId) return;
    getSiteInspection(inspectionId)
      .then(setRecord)
      .catch((error) =>
        toast.error(error instanceof Error ? error.message : 'تعذر تحميل المعاينة')
      );
  }, [inspectionId]);

  if (!record) {
    return <div className="p-10 text-center">جاري تحميل المعاينة...</div>;
  }

  const canEdit = isAdmin || hasPermission('site_inspections', 'canEdit');
  const canPrint = isAdmin || hasPermission('site_inspections', 'canPrint');

  return (
    <div className="w-full min-w-0 space-y-4 sm:space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <Button variant="ghost" className="mb-2 px-0" onClick={() => navigate('/site-inspections')}>
            <ArrowRight className="ml-2 h-4 w-4" />
            العودة إلى المعاينات
          </Button>
          <h1 className="text-2xl font-bold sm:text-3xl">{record.title}</h1>
          <p className="mt-1 font-mono text-sm text-muted-foreground">{record.inspectionNumber}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {canPrint && (
            <Button variant="outline" onClick={() => window.print()}>
              <Printer className="ml-2 h-4 w-4" />
              طباعة
            </Button>
          )}
          {canEdit && (
            <Button onClick={() => navigate(`/site-inspections/${record.id}/edit`)}>
              <Edit className="ml-2 h-4 w-4" />
              تعديل
            </Button>
          )}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Info label="نوع الموقع" value={labels[record.siteType] || record.siteType} />
        <Info label="اسم الموقع" value={record.siteName} />
        <Info label="تاريخ الزيارة" value={new Date(record.visitDate).toLocaleString('ar-SA')} />
        <Info label="القائم بالمعاينة" value={record.inspectorName || '-'} />
        <Info label="الحالة العامة" value={labels[record.overallStatus] || record.overallStatus} />
        <Info label="الأولوية" value={labels[record.priority] || record.priority} />
        <Info label="حالة المعالجة" value={labels[record.workflowStatus] || record.workflowStatus} />
        <Info label="المدينة والحي" value={[record.city, record.district].filter(Boolean).join(' - ') || '-'} />
      </div>

      <Card>
        <CardHeader><CardTitle>بيانات الأرض أو الموقع</CardTitle></CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <Info label="المنطقة" value={record.region || '-'} />
          <Info label="رقم الصك" value={record.deedNumber || '-'} />
          <Info label="رقم القطعة" value={record.plotNumber || '-'} />
          <Info label="رقم المخطط" value={record.planNumber || '-'} />
          <Info label="الجهة المرافقة" value={record.accompanyingEntity || '-'} />
          <Info label="الجهة المحال إليها" value={record.referredEntity || '-'} />
          <div className="md:col-span-2 lg:col-span-3">
            <Info label="وصف الموقع" value={record.locationDescription || '-'} />
          </div>
        </CardContent>
      </Card>

      {(record.latitude != null && record.longitude != null) && (
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><MapPin className="h-5 w-5" />الموقع الجغرافي</CardTitle></CardHeader>
          <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <span className="font-mono">{record.latitude}, {record.longitude}</span>
            <Button
              variant="outline"
              onClick={() => window.open(record.mapUrl || `https://www.google.com/maps?q=${record.latitude},${record.longitude}`, '_blank')}
            >
              <ExternalLink className="ml-2 h-4 w-4" />
              فتح في الخرائط
            </Button>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader><CardTitle>الملاحظات والإجراءات</CardTitle></CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <TextBlock title="سبب الزيارة" value={record.visitPurpose} />
          <TextBlock title="الملاحظات المرصودة" value={record.observations} />
          <TextBlock title="الإجراء المقترح" value={record.recommendedAction} />
          <TextBlock title="تاريخ المتابعة" value={record.followUpDate ? new Date(record.followUpDate).toLocaleDateString('ar-SA') : '-'} />
        </CardContent>
      </Card>

      {record.items.length > 0 && (
        <Card>
          <CardHeader><CardTitle>عناصر المعاينة التفصيلية</CardTitle></CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-2">
            {record.items.map((item, index) => (
              <div key={item.id || index} className="rounded-xl border p-4">
                <div className="flex items-start justify-between gap-3">
                  <p className="font-bold">{item.category}</p>
                  <Badge variant="outline">{labels[item.priority] || item.priority}</Badge>
                </div>
                <p className="mt-2 text-sm text-muted-foreground">{item.note || 'لا توجد تفاصيل'}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            صور المعاينة ({record.attachments.length})
          </CardTitle>
        </CardHeader>

        <CardContent>
          {record.attachments.length === 0 ? (
            <p className="rounded-lg border border-dashed p-8 text-center text-muted-foreground">
              لا توجد صور مرفقة.
            </p>
          ) : (
            <div className="space-y-6">
              {[
                ['general', 'صور عامة للموقع'],
                ['observations', 'صور الملاحظات والمخالفات'],
                ['boundaries', 'صور الحدود والمداخل'],
                ['other', 'صور إضافية'],
              ].map(([category, title]) => {
                const images = record.attachments.filter(
                  (attachment) =>
                    (attachment.notes || 'general') === category
                );

                if (images.length === 0) return null;

                return (
                  <section key={category} className="space-y-3">
                    <h3 className="font-bold">
                      {title} ({images.length})
                    </h3>

                    <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
                      {images.map((attachment) => (
                        <button
                          key={attachment.id || attachment.driveUrl}
                          type="button"
                          className="overflow-hidden rounded-xl border text-right"
                          onClick={() =>
                            window.open(attachment.driveUrl, '_blank')
                          }
                        >
                          {isPdfAttachment(attachment) ? (
                            <iframe
                              src={getAttachmentPreviewUrl(attachment)}
                              title={attachment.title}
                              className="aspect-square w-full bg-white"
                              onClick={(event) => event.stopPropagation()}
                            />
                          ) : (
                            <img
                              src={getAttachmentPreviewUrl(attachment)}
                              alt={attachment.title}
                              className="aspect-square w-full bg-muted object-contain"
                              onError={(event) => {
                                event.currentTarget.src = attachment.driveUrl;
                              }}
                            />
                          )}
                          <p className="truncate p-2 text-xs">
                            {attachment.title}
                          </p>
                        </button>
                      ))}
                    </div>
                  </section>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

const Info = ({ label, value }: { label: string; value: React.ReactNode }) => (
  <div className="rounded-xl border bg-card p-4">
    <p className="text-xs text-muted-foreground">{label}</p>
    <div className="mt-1 break-words font-semibold">{value}</div>
  </div>
);

const TextBlock = ({ title, value }: { title: string; value?: string | null }) => (
  <div className="rounded-xl border p-4">
    <p className="font-semibold">{title}</p>
    <p className="mt-2 whitespace-pre-wrap text-sm leading-7 text-muted-foreground">{value || '-'}</p>
  </div>
);
