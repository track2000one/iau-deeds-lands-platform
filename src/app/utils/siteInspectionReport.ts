import type { SiteInspection } from '../../types/siteInspection';

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

const escapeHtml = (value: unknown): string =>
  String(value ?? '-')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');

const extractGoogleDriveFileId = (attachment: {
  driveFileId?: string | null;
  driveUrl: string;
}): string | null => {
  if (attachment.driveFileId) return attachment.driveFileId;

  const patterns = [/\/file\/d\/([^/]+)/, /[?&]id=([^&]+)/, /\/d\/([^/]+)/];

  for (const pattern of patterns) {
    const match = attachment.driveUrl.match(pattern);
    if (match?.[1]) return decodeURIComponent(match[1]);
  }

  return null;
};

const isPdfAttachment = (attachment: {
  mimeType?: string | null;
  title: string;
}): boolean =>
  attachment.mimeType === 'application/pdf' ||
  attachment.title.toLowerCase().endsWith('.pdf');

const isImageAttachment = (attachment: {
  mimeType?: string | null;
  title: string;
}): boolean =>
  Boolean(attachment.mimeType?.startsWith('image/')) ||
  /\.(png|jpe?g|webp|gif|bmp|svg|heic|heif)$/i.test(attachment.title);

const getAttachmentPreviewUrl = (attachment: {
  driveFileId?: string | null;
  driveUrl: string;
}): string => {
  const fileId = extractGoogleDriveFileId(attachment);
  return fileId
    ? `https://drive.google.com/thumbnail?id=${fileId}&sz=w2000`
    : attachment.driveUrl;
};

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

const buildInspectionBody = (record: SiteInspection, index: number, total: number) => {
  const visitDate = new Date(record.visitDate).toLocaleString('ar-SA');
  const followUpDate = record.followUpDate
    ? new Date(record.followUpDate).toLocaleDateString('ar-SA')
    : '-';

  const imageAttachments = record.attachments.filter(isImageAttachment);
  const documentAttachments = record.attachments.filter(
    (attachment) => !isImageAttachment(attachment)
  );

  const imageGroups = [
    ['general', 'صور عامة للموقع'],
    ['observations', 'صور الملاحظات والمخالفات'],
    ['boundaries', 'صور الحدود والمداخل'],
    ['other', 'صور إضافية'],
  ] as const;

  const itemsHtml = record.items.length
    ? record.items
        .map(
          (item, itemIndex) => `
            <div class="inspection-item">
              <div class="inspection-item-number">${itemIndex + 1}</div>
              <div class="inspection-item-body">
                <div class="inspection-item-heading">
                  <strong>${escapeHtml(item.category)}</strong>
                  <span>${escapeHtml(labels[item.priority] || item.priority)}</span>
                </div>
                <p><strong>الحالة:</strong> ${escapeHtml(item.status || '-')}</p>
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
                (attachment, imageIndex) => `
                  <figure class="photo-card">
                    <img
                      src="${escapeHtml(getAttachmentPreviewUrl(attachment))}"
                      alt="${escapeHtml(attachment.title)}"
                    />
                    <figcaption>
                      <strong>صورة ${imageIndex + 1}</strong>
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

  const documentsHtml = documentAttachments.length
    ? `
      <section class="attachments-list">
        <h3>المستندات والملفات المرفقة</h3>
        ${documentAttachments
          .map(
            (attachment, attachmentIndex) => `
              <div class="attachment-row">
                <span>${attachmentIndex + 1}</span>
                <div>
                  <strong>${escapeHtml(attachment.title)}</strong>
                  <small>${isPdfAttachment(attachment) ? 'ملف PDF' : escapeHtml(attachment.mimeType || 'ملف مرفق')}</small>
                </div>
              </div>
            `
          )
          .join('')}
      </section>
    `
    : '';

  return `
    <article class="inspection-report ${index < total - 1 ? 'page-break' : ''}">
      <header class="report-header">
        <div class="header-topline">
          <div>
            <div class="university">جامعة الإمام عبدالرحمن بن فيصل</div>
            <div class="platform">منصة إدارة الصكوك والأراضي</div>
          </div>
          <div class="report-sequence">${total > 1 ? `التقرير ${index + 1} من ${total}` : 'تقرير رسمي'}</div>
        </div>

        <div class="report-title">تقرير معاينة أرض أو موقع</div>
        <div class="report-subtitle">${escapeHtml(record.title)} — ${escapeHtml(record.siteName)}</div>

        <div class="header-badges">
          <span class="badge">رقم المعاينة: ${escapeHtml(record.inspectionNumber)}</span>
          <span class="badge">تاريخ الزيارة: ${escapeHtml(visitDate)}</span>
          <span class="badge">حالة المعالجة: ${escapeHtml(labels[record.workflowStatus] || record.workflowStatus)}</span>
          <span class="badge">الأولوية: ${escapeHtml(labels[record.priority] || record.priority)}</span>
        </div>
      </header>

      <section class="section">
        <h2 class="section-title">أولًا: بيانات المعاينة والموقع</h2>
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
          ${infoRow(
            'الإحداثيات',
            record.latitude != null && record.longitude != null
              ? `${record.latitude}, ${record.longitude}`
              : '-'
          )}
          ${infoRow('الجهة المحال إليها', record.referredEntity || '-')}
        </div>
      </section>

      <section class="section">
        <h2 class="section-title">ثانيًا: وصف الزيارة ونتائج المعاينة</h2>
        ${textSection('وصف الموقع', record.locationDescription)}
        ${textSection('سبب الزيارة', record.visitPurpose)}
        ${textSection('الملاحظات المرصودة', record.observations)}
        ${textSection('الإجراء المقترح والتوصيات', record.recommendedAction)}
      </section>

      <section class="section">
        <h2 class="section-title">ثالثًا: عناصر المعاينة التفصيلية</h2>
        ${itemsHtml}
      </section>

      <section class="section photo-documentation">
        <h2 class="section-title">رابعًا: التوثيق المصور والمرفقات</h2>
        ${imagesHtml || '<p class="empty-text">لا توجد صور مرفقة بالمعاينة.</p>'}
        ${documentsHtml}
      </section>

      <div class="signature-area">
        <div class="signature-line">القائم بالمعاينة</div>
        <div class="signature-line">مدير الإدارة</div>
        <div class="signature-line">الاعتماد</div>
      </div>

      <footer class="footer">
        <span>تاريخ إعداد التقرير: ${escapeHtml(new Date().toLocaleDateString('ar-SA'))}</span>
        <span>جامعة الإمام عبدالرحمن بن فيصل — منصة إدارة الصكوك والأراضي</span>
      </footer>
    </article>
  `;
};

const getReportStyles = () => `
  @page { size: A4 portrait; margin: 11mm; }
  * { box-sizing: border-box; }
  html { direction: rtl; }
  body {
    margin: 0;
    color: #172033;
    background: #e9edef;
    font-family: Tahoma, Arial, sans-serif;
    font-size: 12px;
    line-height: 1.75;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  .reports-wrapper {
    width: 100%;
    max-width: 940px;
    margin: 0 auto;
    padding: 16px;
  }
  .inspection-report {
    background: #fff;
    padding: 2px;
  }
  .page-break { page-break-after: always; break-after: page; }
  .print-note {
    position: sticky;
    top: 0;
    z-index: 50;
    margin-bottom: 12px;
    border: 1px solid #dfcfaf;
    border-radius: 12px;
    background: #fff8e8;
    color: #725826;
    padding: 9px 12px;
    text-align: center;
    box-shadow: 0 8px 25px rgba(15, 23, 42, .08);
  }
  .report-header {
    position: relative;
    overflow: hidden;
    border: 1px solid #d7ddd9;
    border-radius: 22px;
    padding: 22px;
    margin-bottom: 14px;
    background: linear-gradient(135deg, #ffffff 0%, #f4f0e8 48%, #e7ede8 100%);
    box-shadow: 0 12px 34px rgba(27, 38, 50, .09);
  }
  .report-header::before {
    content: '';
    position: absolute;
    inset: 0;
    background: linear-gradient(115deg, transparent 0 38%, rgba(255,255,255,.72) 48%, transparent 58%);
    pointer-events: none;
  }
  .header-topline { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; }
  .university { font-size: 17px; font-weight: 800; color: #24364b; }
  .platform { margin-top: 2px; color: #6b7280; font-size: 11px; }
  .report-sequence { border: 1px solid rgba(89,102,110,.22); border-radius: 999px; padding: 4px 9px; background: rgba(255,255,255,.75); color: #56636d; font-size: 10px; }
  .report-title { margin: 17px 0 8px; font-size: 23px; font-weight: 900; color: #223c52; }
  .report-subtitle { color: #5e6b76; font-size: 13px; }
  .header-badges { display: flex; flex-wrap: wrap; gap: 7px; margin-top: 13px; }
  .badge { border: 1px solid rgba(89,102,110,.25); background: rgba(255,255,255,.76); border-radius: 999px; padding: 5px 9px; font-size: 10px; color: #425466; }
  .section {
    border: 1px solid #dfe4e1;
    border-radius: 17px;
    margin-bottom: 13px;
    padding: 16px;
    background: linear-gradient(145deg, #fff, #faf9f6);
    box-shadow: 0 7px 22px rgba(27,38,50,.05);
  }
  .section-title { margin: 0 0 12px; padding-bottom: 8px; border-bottom: 2px solid #c8bda9; color: #24364b; font-size: 16px; font-weight: 900; }
  .info-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 9px; }
  .info-item { border: 1px solid #e2e6e2; border-radius: 11px; padding: 8px 10px; background: #fff; break-inside: avoid; }
  .info-label { display: block; color: #7a858d; font-size: 9px; margin-bottom: 2px; }
  .info-value { display: block; color: #1f3348; font-weight: 700; word-break: break-word; }
  .narrative-card { border-right: 4px solid #99866f; border-radius: 11px; padding: 11px 13px; margin-bottom: 9px; background: #fbfaf7; break-inside: avoid; }
  .narrative-card h3 { margin: 0 0 5px; font-size: 13px; color: #2c4053; }
  .narrative-card p { margin: 0; color: #43515d; }
  .inspection-item { display: flex; gap: 9px; margin-bottom: 8px; break-inside: avoid; }
  .inspection-item-number { width: 27px; height: 27px; flex: 0 0 27px; display: grid; place-items: center; border-radius: 50%; background: #33495c; color: #fff; font-weight: 800; }
  .inspection-item-body { flex: 1; border: 1px solid #e0e5e2; border-radius: 11px; padding: 9px 11px; background: #fff; }
  .inspection-item-heading { display: flex; justify-content: space-between; gap: 12px; }
  .inspection-item-heading span { color: #7c6f64; font-size: 10px; }
  .inspection-item p { margin: 4px 0 0; color: #56616a; }
  .photo-section { margin-top: 16px; }
  .photo-section h3 { margin: 0 0 9px; color: #273c50; font-size: 14px; }
  .photo-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 11px; }
  .photo-card { margin: 0; overflow: hidden; border: 1px solid #d9dfdc; border-radius: 13px; background: #fff; break-inside: avoid; box-shadow: 0 5px 16px rgba(20,30,40,.06); }
  .photo-card img { display: block; width: 100%; height: 225px; object-fit: contain; background: #f2f3f1; }
  .photo-card figcaption { padding: 8px 9px; display: flex; flex-direction: column; gap: 1px; }
  .photo-card figcaption span { font-size: 9px; color: #6b7280; word-break: break-word; }
  .attachments-list { margin-top: 15px; }
  .attachments-list h3 { color: #273c50; font-size: 14px; }
  .attachment-row { display: flex; gap: 9px; padding: 8px 0; border-bottom: 1px solid #ecefed; }
  .attachment-row > span { width: 23px; height: 23px; display: grid; place-items: center; border-radius: 50%; background: #e8ece9; }
  .attachment-row div { display: flex; flex-direction: column; }
  .attachment-row small { color: #7b858c; }
  .signature-area { display: grid; grid-template-columns: repeat(3, 1fr); gap: 42px; margin-top: 38px; padding: 0 22px; break-inside: avoid; }
  .signature-line { padding-top: 8px; border-top: 1px solid #273646; text-align: center; font-weight: 700; }
  .footer { margin-top: 22px; padding-top: 9px; border-top: 1px solid #dfe3e0; color: #69757e; display: flex; justify-content: space-between; gap: 16px; font-size: 9px; }
  .empty-text { color: #7b858c; text-align: center; }
  @media print {
    body { background: #fff; }
    .reports-wrapper { max-width: none; padding: 0; }
    .print-note { display: none; }
    .section, .report-header, .photo-card { box-shadow: none; }
  }
  @media (max-width: 720px) {
    .reports-wrapper { padding: 8px; }
    .info-grid { grid-template-columns: 1fr 1fr; }
    .photo-grid { grid-template-columns: 1fr; }
    .signature-area { grid-template-columns: 1fr; gap: 32px; }
  }
`;

export const buildSiteInspectionReportHtml = (
  records: SiteInspection[]
): string => {
  const safeRecords = records.filter(Boolean);
  const title =
    safeRecords.length > 1
      ? 'تقارير معاينات الأراضي والمواقع'
      : `تقرير ${safeRecords[0]?.inspectionNumber || 'معاينة أرض أو موقع'}`;

  return `<!doctype html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHtml(title)}</title>
  <style>${getReportStyles()}</style>
</head>
<body>
  <main class="reports-wrapper">
    <div class="print-note">
      انتظر حتى اكتمال تحميل الصور، ثم اختر الطابعة أو الحفظ بصيغة PDF.
    </div>
    ${safeRecords
      .map((record, index) => buildInspectionBody(record, index, safeRecords.length))
      .join('')}
  </main>

  <script>
    let printStarted = false;
    const startPrint = () => {
      if (printStarted) return;
      printStarted = true;
      setTimeout(() => window.print(), 500);
    };

    const images = Array.from(document.images);
    if (!images.length) {
      startPrint();
    } else {
      let completed = 0;
      const finishOne = () => {
        completed += 1;
        if (completed >= images.length) startPrint();
      };
      images.forEach((img) => {
        if (img.complete) finishOne();
        else {
          img.addEventListener('load', finishOne, { once: true });
          img.addEventListener('error', finishOne, { once: true });
        }
      });
      setTimeout(startPrint, 10000);
    }
  </script>
</body>
</html>`;
};

export const openSiteInspectionReports = (
  records: SiteInspection[]
): boolean => {
  if (!records.length) return false;

  const reportWindow = window.open('', '_blank', 'noopener,noreferrer');
  if (!reportWindow) return false;

  reportWindow.document.open();
  reportWindow.document.write(buildSiteInspectionReportHtml(records));
  reportWindow.document.close();
  return true;
};

export const openSiteInspectionReport = (record: SiteInspection): boolean =>
  openSiteInspectionReports([record]);
