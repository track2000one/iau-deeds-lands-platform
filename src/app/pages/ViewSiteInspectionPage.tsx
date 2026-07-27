import React from 'react';
import { useNavigate, useParams } from 'react-router';
import {
  ArrowRight,
  Edit,
  ExternalLink,
  CalendarDays,
  ClipboardCheck,
  FileText,
  Images,
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


const escapeHtml = (value: unknown): string =>
  String(value ?? '-')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');

const buildInspectionReportHtml = (record: SiteInspection): string => {
  const reportDate = new Date().toLocaleDateString('ar-SA', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const visitDate = new Date(record.visitDate).toLocaleString('ar-SA');
  const followUpDate = record.followUpDate
    ? new Date(record.followUpDate).toLocaleDateString('ar-SA')
    : '-';

  const imageAttachments = record.attachments.filter(
    (attachment) => !isPdfAttachment(attachment)
  );
  const pdfAttachments = record.attachments.filter(isPdfAttachment);

  const imageGroups = [
    ['general', 'صور عامة للموقع'],
    ['observations', 'صور الملاحظات والمخالفات'],
    ['boundaries', 'صور الحدود والمداخل'],
    ['other', 'صور إضافية'],
  ] as const;

  const infoRow = (label: string, value: unknown) => `
    <div class="info-item">
      <span class="info-label">${escapeHtml(label)}</span>
      <span class="info-value">${escapeHtml(value)}</span>
    </div>
  `;

  const textSection = (title: string, value: unknown) => `
    <section class="narrative-card">
      <h3>${escapeHtml(title)}</h3>
      <p>${escapeHtml(value || '-').replaceAll('\n', '<br />')}</p>
    </section>
  `;

  const itemsHtml = record.items.length
    ? record.items
        .map(
          (item, index) => `
            <div class="inspection-item">
              <div class="inspection-item-number">${index + 1}</div>
              <div class="inspection-item-body">
                <div class="inspection-item-heading">
                  <strong>${escapeHtml(item.category)}</strong>
                  <span>${escapeHtml(labels[item.priority] || item.priority)}</span>
                </div>
                <p>${escapeHtml(item.note || 'لا توجد تفاصيل')}</p>
              </div>
            </div>
          `
        )
        .join('')
    : '<p class="empty-text">لا توجد عناصر تفصيلية مسجلة.</p>';

  const imagesHtml = imageGroups
    .map(([category, title]) => {
      const group = imageAttachments.filter(
        (attachment) => (attachment.notes || 'general') === category
      );

      if (!group.length) return '';

      return `
        <section class="photo-section">
          <h3>${escapeHtml(title)}</h3>
          <div class="photo-grid">
            ${group
              .map(
                (attachment, index) => `
                  <figure class="photo-card">
                    <img
                      src="${escapeHtml(getAttachmentPreviewUrl(attachment))}"
                      alt="${escapeHtml(attachment.title)}"
                      crossorigin="anonymous"
                    />
                    <figcaption>
                      <strong>صورة ${index + 1}</strong>
                      <span>${escapeHtml(attachment.title)}</span>
                    </figcaption>
                  </figure>
                `
              )
              .join('')}
          </div>
        </section>
      `;
    })
    .join('');

  const pdfHtml = pdfAttachments.length
    ? `
      <section class="attachments-list">
        <h3>المستندات المرفقة</h3>
        ${pdfAttachments
          .map(
            (attachment, index) => `
              <div class="attachment-row">
                <span>${index + 1}</span>
                <div>
                  <strong>${escapeHtml(attachment.title)}</strong>
                  <small>${escapeHtml(attachment.driveUrl)}</small>
                </div>
              </div>
            `
          )
          .join('')}
      </section>
    `
    : '';

  return `<!doctype html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>تقرير ${escapeHtml(record.inspectionNumber)}</title>
  <style>
    @page { size: A4 portrait; margin: 12mm; }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      color: #172033;
      background: #eef1f3;
      font-family: Tahoma, Arial, sans-serif;
      font-size: 13px;
      line-height: 1.8;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .report {
      width: 100%;
      max-width: 920px;
      margin: 0 auto;
      background: #fff;
    }
    .report-header {
      position: relative;
      overflow: hidden;
      border: 1px solid #d9ddd9;
      border-radius: 22px;
      padding: 24px;
      margin-bottom: 16px;
      background: linear-gradient(135deg, #ffffff 0%, #f4f0e9 48%, #e9eee9 100%);
      box-shadow: 0 12px 36px rgba(27, 38, 50, 0.10);
    }
    .report-header::before {
      content: '';
      position: absolute;
      inset: 0;
      background: linear-gradient(115deg, transparent 0 38%, rgba(255,255,255,.72) 48%, transparent 58%);
      pointer-events: none;
    }
    .university { font-size: 18px; font-weight: 800; color: #24364b; }
    .platform { margin-top: 2px; color: #6b7280; font-size: 12px; }
    .report-title {
      margin: 18px 0 10px;
      font-size: 24px;
      font-weight: 900;
      color: #223c52;
    }
    .report-subtitle { color: #5e6b76; }
    .header-badges { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 14px; }
    .badge {
      border: 1px solid rgba(89, 102, 110, .25);
      background: rgba(255,255,255,.72);
      border-radius: 999px;
      padding: 5px 10px;
      font-size: 11px;
      color: #425466;
    }
    .section {
      border: 1px solid #dfe4e1;
      border-radius: 18px;
      margin-bottom: 14px;
      padding: 18px;
      background: linear-gradient(145deg, #fff, #faf9f6);
      box-shadow: 0 8px 24px rgba(27, 38, 50, 0.055);
      break-inside: avoid;
    }
    .section-title {
      display: flex;
      align-items: center;
      gap: 8px;
      margin: 0 0 13px;
      padding-bottom: 9px;
      border-bottom: 2px solid #c8bda9;
      color: #24364b;
      font-size: 17px;
      font-weight: 900;
    }
    .info-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; }
    .info-item {
      border: 1px solid #e2e6e2;
      border-radius: 12px;
      padding: 9px 11px;
      background: #fff;
    }
    .info-label { display: block; color: #7a858d; font-size: 10px; margin-bottom: 2px; }
    .info-value { display: block; color: #1f3348; font-weight: 700; word-break: break-word; }
    .narrative-card {
      border-right: 4px solid #99866f;
      border-radius: 12px;
      padding: 12px 14px;
      margin-bottom: 10px;
      background: #fbfaf7;
      break-inside: avoid;
    }
    .narrative-card h3 { margin: 0 0 6px; font-size: 14px; color: #2c4053; }
    .narrative-card p { margin: 0; color: #43515d; white-space: normal; }
    .inspection-item { display: flex; gap: 10px; margin-bottom: 9px; break-inside: avoid; }
    .inspection-item-number {
      width: 28px; height: 28px; flex: 0 0 28px;
      display: grid; place-items: center;
      border-radius: 50%; background: #33495c; color: #fff; font-weight: 800;
    }
    .inspection-item-body { flex: 1; border: 1px solid #e0e5e2; border-radius: 12px; padding: 10px 12px; background: #fff; }
    .inspection-item-heading { display: flex; justify-content: space-between; gap: 12px; }
    .inspection-item-heading span { color: #7c6f64; font-size: 11px; }
    .inspection-item p { margin: 5px 0 0; color: #56616a; }
    .photo-section { margin-top: 18px; break-before: auto; }
    .photo-section h3 { margin: 0 0 10px; color: #273c50; font-size: 15px; }
    .photo-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; }
    .photo-card {
      margin: 0;
      overflow: hidden;
      border: 1px solid #d9dfdc;
      border-radius: 14px;
      background: #fff;
      break-inside: avoid;
      box-shadow: 0 6px 18px rgba(20, 30, 40, .07);
    }
    .photo-card img {
      display: block;
      width: 100%;
      height: 235px;
      object-fit: contain;
      background: #f2f3f1;
    }
    .photo-card figcaption { padding: 8px 10px; display: flex; flex-direction: column; gap: 1px; }
    .photo-card figcaption span { font-size: 10px; color: #6b7280; word-break: break-word; }
    .attachments-list { margin-top: 16px; }
    .attachment-row { display: flex; gap: 10px; padding: 9px 0; border-bottom: 1px solid #ecefed; }
    .attachment-row > span { width: 24px; height: 24px; display: grid; place-items: center; border-radius: 50%; background: #e8ece9; }
    .attachment-row div { display: flex; flex-direction: column; }
    .attachment-row small { direction: ltr; color: #7b858c; word-break: break-all; }
    .signature-area {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 80px;
      margin-top: 42px;
      padding: 0 32px;
      break-inside: avoid;
    }
    .signature-line { padding-top: 8px; border-top: 1px solid #273646; text-align: center; font-weight: 700; }
    .footer {
      margin-top: 24px;
      padding-top: 10px;
      border-top: 1px solid #dfe3e0;
      color: #69757e;
      display: flex;
      justify-content: space-between;
      font-size: 10px;
    }
    .empty-text { color: #7b858c; text-align: center; }
    .print-note {
      margin-bottom: 12px; border: 1px solid #e2d4b8; border-radius: 10px;
      background: #fff9ea; color: #7a5f2d; padding: 8px 10px; text-align: center;
    }
    @media print {
      body { background: #fff; }
      .report { max-width: none; }
      .print-note { display: none; }
      .section, .report-header, .photo-card { box-shadow: none; }
    }
    @media (max-width: 720px) {
      .info-grid { grid-template-columns: 1fr 1fr; }
      .photo-grid { grid-template-columns: 1fr; }
    }
  </style>
</head>
<body>
  <main class="report">
    <div class="print-note">تم إعداد التقرير للطباعة. انتظر اكتمال تحميل الصور ثم اختر الطابعة أو الحفظ بصيغة PDF.</div>

    <header class="report-header">
      <div class="university">جامعة الإمام عبدالرحمن بن فيصل</div>
      <div class="platform">منصة إدارة الصكوك والأراضي</div>
      <div class="report-title">تقرير معاينة أرض أو موقع</div>
      <div class="report-subtitle">${escapeHtml(record.title)} — ${escapeHtml(record.siteName)}</div>
      <div class="header-badges">
        <span class="badge">رقم المعاينة: ${escapeHtml(record.inspectionNumber)}</span>
        <span class="badge">تاريخ الزيارة: ${escapeHtml(visitDate)}</span>
        <span class="badge">الحالة: ${escapeHtml(labels[record.workflowStatus] || record.workflowStatus)}</span>
        <span class="badge">الأولوية: ${escapeHtml(labels[record.priority] || record.priority)}</span>
      </div>
    </header>

    <section class="section">
      <h2 class="section-title">بيانات المعاينة والموقع</h2>
      <div class="info-grid">
        ${infoRow('نوع الموقع', labels[record.siteType] || record.siteType)}
        ${infoRow('اسم الموقع', record.siteName)}
        ${infoRow('القائم بالمعاينة', record.inspectorName || '-')}
        ${infoRow('الجهة المرافقة', record.accompanyingEntity || '-')}
        ${infoRow('المنطقة', record.region || '-')}
        ${infoRow('المدينة', record.city || '-')}
        ${infoRow('الحي', record.district || '-')}
        ${infoRow('رقم الصك', record.deedNumber || '-')}
        ${infoRow('رقم القطعة', record.plotNumber || '-')}
        ${infoRow('رقم المخطط', record.planNumber || '-')}
        ${infoRow('الحالة العامة', labels[record.overallStatus] || record.overallStatus)}
        ${infoRow('تاريخ المتابعة', followUpDate)}
        ${infoRow('الإحداثيات', record.latitude != null && record.longitude != null ? `${record.latitude}, ${record.longitude}` : '-')}
        ${infoRow('الجهة المحال إليها', record.referredEntity || '-')}
      </div>
    </section>

    <section class="section">
      <h2 class="section-title">وصف الزيارة ونتائج المعاينة</h2>
      ${textSection('وصف الموقع', record.locationDescription)}
      ${textSection('سبب الزيارة', record.visitPurpose)}
      ${textSection('الملاحظات المرصودة', record.observations)}
      ${textSection('الإجراء المقترح والتوصيات', record.recommendedAction)}
    </section>

    <section class="section">
      <h2 class="section-title">عناصر المعاينة التفصيلية</h2>
      ${itemsHtml}
    </section>

    <section class="section">
      <h2 class="section-title">التوثيق المصور</h2>
      ${imagesHtml || '<p class="empty-text">لا توجد صور مرفقة بالمعاينة.</p>'}
      ${pdfHtml}
    </section>

    <div class="signature-area">
      <div class="signature-line">القائم بالمعاينة</div>
      <div class="signature-line">الاعتماد</div>
    </div>

    <footer class="footer">
      <span>تاريخ إعداد التقرير: ${escapeHtml(reportDate)}</span>
      <span>جامعة الإمام عبدالرحمن بن فيصل — منصة إدارة الصكوك والأراضي</span>
    </footer>
  </main>

  <script>
    const images = Array.from(document.images);
    const done = () => setTimeout(() => window.print(), 450);
    if (!images.length) {
      done();
    } else {
      let completed = 0;
      const finishOne = () => {
        completed += 1;
        if (completed >= images.length) done();
      };
      images.forEach((img) => {
        if (img.complete) finishOne();
        else {
          img.addEventListener('load', finishOne, { once: true });
          img.addEventListener('error', finishOne, { once: true });
        }
      });
      setTimeout(done, 7000);
    }
  </script>
</body>
</html>`;
};

const openInspectionReport = (record: SiteInspection) => {
  const html = buildInspectionReportHtml(record);
  const reportWindow = window.open('', '_blank', 'noopener,noreferrer');

  if (!reportWindow) {
    toast.error('تعذر فتح التقرير. فعّل السماح بالنوافذ المنبثقة في المتصفح.');
    return;
  }

  reportWindow.document.open();
  reportWindow.document.write(html);
  reportWindow.document.close();
};

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
            <Button variant="outline" onClick={() => openInspectionReport(record)}>
              <Printer className="ml-2 h-4 w-4" />
              التقرير المستقل
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

      <Card className="overflow-hidden rounded-[26px] border border-white/50 bg-white/65 shadow-[0_18px_55px_rgba(15,23,42,0.08),inset_0_1px_0_rgba(255,255,255,0.9)] backdrop-blur-xl">
        <CardContent className="grid gap-4 p-5 sm:grid-cols-[auto_1fr] sm:items-center">
          <div className="grid h-14 w-14 place-items-center rounded-2xl border border-white/60 bg-white/75 shadow-inner">
            <ClipboardCheck className="h-7 w-7 text-slate-700" />
          </div>
          <div>
            <p className="font-bold">تقرير معاينة مستقل</p>
            <p className="mt-1 text-sm leading-7 text-muted-foreground">
              تقرير سردي متكامل يضم بيانات الموقع وسبب الزيارة والملاحظات والتوصيات وعناصر المعاينة والصور، ويُطبع بصيغة رسمية مستقلة عن الجداول العامة.
            </p>
          </div>
        </CardContent>
      </Card>

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
