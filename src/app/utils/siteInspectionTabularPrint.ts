import type { InspectionAttachment, SiteInspection } from '../../types/siteInspection';
import { authenticatedFetch } from '../../lib/http';

export type InspectionPrintColumn =
  | 'inspectionNumber' | 'title' | 'siteName' | 'siteType'
  | 'visitDate' | 'inspectorName' | 'city' | 'district'
  | 'overallStatus' | 'workflowStatus' | 'priority'
  | 'observations' | 'recommendedAction' | 'attachmentCount';

export const inspectionPrintColumns: { key: InspectionPrintColumn; label: string }[] = [
  { key: 'inspectionNumber', label: 'رقم المعاينة' },
  { key: 'title', label: 'عنوان المعاينة' },
  { key: 'siteName', label: 'اسم الموقع' },
  { key: 'siteType', label: 'نوع الموقع' },
  { key: 'visitDate', label: 'تاريخ الزيارة' },
  { key: 'inspectorName', label: 'القائم بالمعاينة' },
  { key: 'city', label: 'المدينة' },
  { key: 'district', label: 'الحي' },
  { key: 'overallStatus', label: 'الحالة العامة' },
  { key: 'workflowStatus', label: 'حالة المعاملة' },
  { key: 'priority', label: 'الأولوية' },
  { key: 'observations', label: 'الملاحظات' },
  { key: 'recommendedAction', label: 'الإجراء المقترح' },
  { key: 'attachmentCount', label: 'عدد الصور' },
];

export const defaultInspectionPrintColumns: InspectionPrintColumn[] = [
  'inspectionNumber', 'siteName', 'visitDate', 'city',
  'overallStatus', 'workflowStatus', 'observations', 'recommendedAction',
];

const labels: Record<string, string> = {
  new: 'جديدة', under_review: 'قيد المراجعة', referred: 'تمت الإحالة',
  in_progress: 'جارٍ التنفيذ', resolved: 'تمت المعالجة', closed: 'مغلقة',
  excellent: 'ممتازة', good: 'جيدة', follow_up: 'تحتاج متابعة',
  maintenance: 'تحتاج صيانة', major_notes: 'ملاحظات جوهرية', emergency: 'حالة طارئة',
  low: 'منخفضة', normal: 'عادية', high: 'عالية', urgent: 'عاجلة',
  land: 'أرض', building: 'مبنى', facility: 'مرفق', general_site: 'موقع عام', other: 'أخرى',
};

const escapeHtml = (value: unknown): string =>
  String(value ?? '-')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const isImage = (file: InspectionAttachment) =>
  Boolean(file.mimeType?.startsWith('image/')) ||
  /\.(png|jpe?g|gif|webp|bmp|heic|heif)$/i.test(file.title);

const fileId = (file: InspectionAttachment): string | null => {
  if (file.driveFileId) return file.driveFileId;
  const url = file.driveUrl || '';
  const match = url.match(/\/file\/d\/([^/?#]+)/) || url.match(/[?&]id=([^&#]+)/);
  if (!match) return null;
  try { return decodeURIComponent(match[1]); } catch { return null; }
};

const asDataUrl = (blob: Blob): Promise<string> => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.onerror = () => reject(new Error('تعذر قراءة ملف الصورة'));
  reader.onload = () => resolve(String(reader.result || ''));
  reader.readAsDataURL(blob);
});

type PhotoRow = { record: SiteInspection; file: InspectionAttachment; image: string | null };

export type SiteInspectionTablePrintOptions = {
  title: string;
  columns: InspectionPrintColumn[];
  includePhotos: boolean;
  criteria?: string;
};

// Fetch through the authenticated backend so private Google Drive images can be printed,
// without exposing bearer tokens in the print window's HTML or URLs.
const preparePhotos = async (records: SiteInspection[]): Promise<PhotoRow[]> => {
  const rows = records.flatMap((record) =>
    (record.attachments || []).filter(isImage).map((file) => ({ record, file, image: null as string | null }))
  );
  let index = 0;
  const workers = Array.from({ length: Math.min(3, rows.length) }, async () => {
    while (index < rows.length) {
      const row = rows[index++];
      const id = fileId(row.file);
      if (!id) continue;
      try {
        const response = await authenticatedFetch('/api/uploads/' + encodeURIComponent(id) + '/content', {}, 40000);
        if (!response.ok) continue;
        const blob = await response.blob();
        if (!blob.type.startsWith('image/') || blob.size > 15 * 1024 * 1024) continue;
        row.image = await asDataUrl(blob);
      } catch {
        // A non-readable or unavailable image is explicitly marked in the printed appendix.
      }
    }
  });
  await Promise.all(workers);
  return rows;
};

const formatDate = (value: string) => {
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? '-' : d.toLocaleDateString('ar-SA-u-ca-gregory');
};

const valueFor = (record: SiteInspection, key: InspectionPrintColumn): string => {
  switch (key) {
    case 'visitDate': return formatDate(record.visitDate);
    case 'overallStatus':
    case 'workflowStatus':
    case 'priority':
    case 'siteType': return labels[record[key]] || record[key] || '-';
    case 'attachmentCount': return String((record.attachments || []).filter(isImage).length);
    default: return String(record[key] ?? '-');
  }
};

const style = [
  '@page { size: A4 landscape; margin: 12mm; }',
  '* { box-sizing: border-box; }',
  'html, body { direction: rtl; margin: 0; padding: 0; }',
  'body { background: #eef3f4; color: #203044; font: 12px/1.7 Tahoma,Arial,sans-serif; print-color-adjust: exact; -webkit-print-color-adjust: exact; }',
  'main { max-width: 1280px; margin: 16px auto; background: #fff; padding: 18px; }',
  '.header { border: 1px solid #bbd3ce; border-right: 5px solid #0b5749; padding: 15px; background: #f3f9f6; margin-bottom: 16px; }',
  '.university { font-size: 17px; font-weight: bold; color: #0b4a3f; }',
  '.subtitle { color: #5f6f7c; }',
  'h1 { margin: 12px 0 6px; color: #0b4a3f; font-size: 21px; }',
  'h2 { color: #0b4a3f; font-size: 16px; margin: 20px 0 8px; }',
  '.meta { display: flex; flex-wrap: wrap; gap: 12px; color: #45566b; font-weight: bold; }',
  'table { width: 100%; border-collapse: collapse; table-layout: auto; }',
  'thead { display: table-header-group; }',
  'tr { break-inside: avoid; page-break-inside: avoid; }',
  'th, td { border: 1px solid #c9d5d9; text-align: right; vertical-align: top; padding: 7px 8px; overflow-wrap: anywhere; white-space: pre-wrap; }',
  'th { color: #fff; background: #0b5749; font-size: 11px; white-space: normal; }',
  'tbody tr:nth-child(even) td { background: #f3f8f7; }',
  '.count { white-space: nowrap; }',
  '.photo { max-width: 160px; max-height: 115px; object-fit: contain; display: block; }',
  '.unavailable { color: #a43c2b; font-weight: bold; }',
  '.toolbar { max-width: 1280px; margin: 12px auto 0; padding: 12px; display: flex; gap: 14px; justify-content: space-between; align-items: center; background: #fff; border: 1px solid #c9d5d9; }',
  '.toolbar button { background: #0b5749; color: #fff; border: 0; padding: 10px 20px; border-radius: 8px; font-weight: bold; cursor: pointer; }',
  '.note { margin: 15px 0; color: #64748b; }',
  '.footer { border-top: 1px solid #bbc9cc; margin-top: 20px; padding-top: 8px; font-size: 10px; color: #64748b; }',
  '@media print { body { background: #fff; } main { margin: 0; padding: 0; max-width: none; } .toolbar { display: none; } .header { margin-bottom: 12px; } }',
].join('\n');

const renderReport = (records: SiteInspection[], options: SiteInspectionTablePrintOptions, photos: PhotoRow[]): string => {
  const cols = inspectionPrintColumns.filter((col) => options.columns.includes(col.key));
  const head = cols.map((col) => '<th scope="col">' + escapeHtml(col.label) + '</th>').join('');
  const body = records.map((record, i) =>
    '<tr><td class="count">' + (i + 1) + '</td>' +
    cols.map((col) => '<td>' + escapeHtml(valueFor(record, col.key)) + '</td>').join('') +
    '</tr>'
  ).join('');
  const photoBody = photos.map(({ record, file, image }, i) =>
    '<tr><td>' + (i + 1) + '</td><td>' + escapeHtml(record.inspectionNumber) + '</td><td>' +
    escapeHtml(record.siteName) + '</td><td>' + escapeHtml(file.title) + '</td><td>' +
    (image ? '<img class="photo" src="' + image + '" alt="' + escapeHtml(file.title) + '" />' :
      '<span class="unavailable">تعذّر تحميل الصورة — تحقّق من صلاحية الملف</span>') +
    '</td></tr>'
  ).join('');
  const imagesSection = options.includePhotos
    ? '<h2>الملحق المصوّر للمعاينات</h2>' +
      (photos.length
        ? '<table><thead><tr><th>م</th><th>رقم المعاينة</th><th>الموقع</th><th>اسم الصورة</th><th>الصورة</th></tr></thead><tbody>' + photoBody + '</tbody></table>'
        : '<p class="note">لا توجد صور مرفقة بالمعاينات المحددة.</p>')
    : '';
  const unavailable = photos.filter((photo) => !photo.image).length;
  const photoNotice = unavailable ? ' — عدد الصور التي تعذر تحميلها: ' + unavailable : '';
  return '<!doctype html><html lang="ar" dir="rtl"><head><meta charset="UTF-8"/><title>' + escapeHtml(options.title) +
    '</title><style>' + style + '</style></head><body>' +
    '<div class="toolbar"><strong>معاينة التقرير الجدولي — تأكد من الصور قبل الطباعة' + escapeHtml(photoNotice) +
    '</strong><button type="button" onclick="window.print()">طباعة / حفظ PDF</button></div>' +
    '<main><header class="header"><div class="university">جامعة الإمام عبدالرحمن بن فيصل</div>' +
    '<div class="subtitle">منصة إدارة الصكوك والأراضي — تقارير المعاينات الميدانية</div><h1>' +
    escapeHtml(options.title) + '</h1><div class="meta"><span>عدد المعاينات: ' + records.length +
    '</span><span>التاريخ: ' + escapeHtml(new Date().toLocaleDateString('ar-SA-u-ca-gregory')) +
    '</span><span>التوثيق المصوّر: ' + (options.includePhotos ? 'مضمّن' : 'مستبعد') + '</span></div>' +
    (options.criteria ? '<p class="subtitle">معايير التقرير: ' + escapeHtml(options.criteria) + '</p>' : '') +
    '</header><table><thead><tr><th scope="col">م</th>' + head + '</tr></thead><tbody>' + body + '</tbody></table>' +
    imagesSection + '<footer class="footer">تم إعداد التقرير من المعاينات المسجلة في المنصة، وفق معايير الفرز والتصفية المحددة.</footer></main></body></html>';
};

export const openSiteInspectionTableReport = async (
  records: SiteInspection[], options: SiteInspectionTablePrintOptions
): Promise<boolean> => {
  if (!records.length || !options.columns.length) return false;
  // Open synchronously during the user click: later image requests should not trigger popup blockers.
  const windowRef = window.open('', '_blank');
  if (!windowRef) return false;

  windowRef.document.open();
  windowRef.document.write('<!doctype html><html lang="ar" dir="rtl"><meta charset="UTF-8"><title>تجهيز التقرير</title><body style="font:18px Tahoma;padding:40px">جارٍ تجهيز تقرير المعاينات والصور...</body></html>');
  windowRef.document.close();
  try {
    const photos = options.includePhotos ? await preparePhotos(records) : [];
    if (windowRef.closed) return true;
    windowRef.document.open();
    windowRef.document.write(renderReport(records, options, photos));
    windowRef.document.close();
    return true;
  } catch (error) {
    if (!windowRef.closed) {
      windowRef.document.body.textContent = 'تعذر تجهيز تقرير المعاينات. يرجى إعادة المحاولة.';
    }
    throw error;
  }
};
