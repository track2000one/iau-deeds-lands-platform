import { mosqueApi, type MosqueFieldTour, type MosqueFieldVisit, type MosqueFieldVisitImage } from '../api/mosques';
import { withReportPreparer } from './reportAttribution';

export type TourBatchImageMode = 'all' | 'one_per_visit' | 'none';
export type TourBatchReportEntry = {
  tour: MosqueFieldTour;
  creatorName: string;
  visits: MosqueFieldVisit[];
};

export const MAX_TOURS_PER_PDF = 60;
export const MAX_TOUR_PDF_IMAGES = 120;

type PhotoEntry = {
  visitId: string;
  file: MosqueFieldVisitImage;
  caption: string;
  key: string;
};

const esc = (value: unknown): string => String(value ?? '')
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;').replace(/'/g, '&#39;');

const dateRiyadh = (value?: string | null) => value
  ? new Date(value).toLocaleString('ar-SA-u-ca-gregory-nu-latn', {
      timeZone: 'Asia/Riyadh', year: 'numeric', month: '2-digit',
      day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: true,
    })
  : '—';

const tourStates: Record<string, string> = {
  scheduled: 'مجدولة', in_progress: 'جارية', completed: 'مكتملة',
  postponed: 'مؤجلة', cancelled: 'ملغاة',
};
const visitStates: Record<string, string> = {
  planned: 'مجدولة', in_progress: 'جارية', completed: 'مكتملة',
  follow_up: 'تحتاج متابعة', closed: 'مغلقة',
};
const itemStates: Record<string, string> = {
  good: 'سليم', needs_action: 'يحتاج معالجة', not_checked: 'لم يُفحص',
  not_applicable: 'لا ينطبق', not_available: 'غير متاح',
};
const scopeStates: Record<string, string> = {
  whole_site: 'الموقع بالكامل', men_section: 'قسم الرجال',
  women_section: 'مصلى النساء', both_sections: 'الرجال ومصلى النساء',
};
const priorityStates: Record<string, string> = {
  low: 'منخفضة', normal: 'عادية', medium: 'متوسطة', high: 'عالية', urgent: 'عاجلة',
};

const isImage = (file: MosqueFieldVisitImage) =>
  /^image\//i.test(file.mimeType || '') || /\.(png|jpe?g|webp|gif)$/i.test(file.fileName || '') ||
  /^data:image\//i.test(file.url || '');

export const collectTourReportPhotos = (entries: TourBatchReportEntry[], mode: TourBatchImageMode): PhotoEntry[] => {
  if (mode === 'none') return [];
  const all: PhotoEntry[] = [];
  let counter = 0;
  for (const entry of entries) {
    for (const visit of entry.visits) {
      const files = [
        ...(visit.attachments || []).filter(isImage).map((file) => ({ file, caption: 'مرفق الزيارة' })),
        ...(visit.items || []).flatMap((item) => [
          ...(item.beforeImages || []).filter(isImage).map((file) => ({
            file, caption: 'قبل المعالجة — ' + item.title,
          })),
          ...(item.afterImages || []).filter(isImage).map((file) => ({
            file, caption: 'بعد المعالجة — ' + item.title,
          })),
        ]),
      ];
      const selected = mode === 'one_per_visit' ? files.slice(0, 1) : files;
      for (const photo of selected) {
        all.push({ ...photo, visitId: visit.id, key: String(counter++) });
      }
    }
  }
  return all;
};

const photoCss = [
  '@page { size: A4 landscape; margin: 11mm; }',
  '* { box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }',
  'body { direction: rtl; font: 11px/1.7 Tahoma, Arial, sans-serif; color: #17324b; background: #fff; margin: 0; }',
  'h1 { font-size: 22px; margin: 0 0 7px; } h2 { font-size: 17px; margin: 3px 0 10px; }',
  'h3 { font-size: 13px; margin: 6px 0; } p { margin: 4px 0; }',
  '.toolbar { position: sticky; top: 0; z-index: 5; display:flex; gap: 18px; align-items:center; justify-content:space-between; padding:11px 16px; background:#e9f5fc; border-bottom:1px solid #bed1e4; }',
  '.toolbar button { border:0; border-radius:7px; color:white; background:#0f766e; padding:9px 22px; cursor:pointer; font-weight:bold; }',
  '.toolbar button:disabled { opacity: 0.5; cursor:wait; }',
  '.cover { border:2px solid #0e627e; background: #f1f9fd; padding:17px; border-radius:13px; }',
  '.kicker { color:#0f766e; font-weight:bold; font-size:12px; }',
  '.muted { color:#53697e; } .tiny { font-size:10px; }',
  '.criteria { margin-top:12px; border:1px solid #d4e2ed; background:#f9fbfe; padding:10px; border-radius:7px; }',
  '.metrics { display:grid; grid-template-columns:repeat(5,1fr); gap:8px; margin:12px 0; }',
  '.metric { border:1px solid #cadbe7; border-radius:9px; padding:8px; background:#fff; text-align:center; }',
  '.metric small { display:block; color:#587184; } .metric strong { font-size:17px; display:block; }',
  '.tour { break-before:page; page-break-before:always; } .tour:first-of-type { break-before:auto; page-break-before:auto; }',
  '.tour-head { border-bottom:3px solid #0f766e; margin-bottom:11px; padding:8px 0; }',
  '.info { display:grid; grid-template-columns:repeat(4,1fr); gap:6px; margin-bottom:11px; }',
  '.info div { border:1px solid #d3e1ea; border-radius:7px; padding:7px; overflow-wrap:anywhere; }',
  '.info small { display:block; color:#64748b; } .info strong { display:block; }',
  '.visit { margin:14px 0 20px; }',
  '.visit-head { background:#eaf4fa; border:1px solid #c5dce9; padding:9px; border-radius:8px; }',
  '.visit-head span { color:#536b81; font-size:10px; margin-inline-start:10px; }',
  'table { width:100%; border-collapse:collapse; table-layout:fixed; margin-top:8px; }',
  'th,td { border:1px solid #cbd9e4; padding:6px; text-align:right; vertical-align:top; overflow-wrap:anywhere; }',
  'th { background:#eff4f8; } tr { break-inside:avoid; page-break-inside:avoid; } thead { display:table-header-group; }',
  '.notes { display:grid; grid-template-columns:1fr 1fr; gap:8px; margin:9px 0; }',
  '.notes div { white-space:pre-wrap; border:1px solid #d0dbe5; background:#f9fbfc; padding:8px; border-radius:8px; }',
  '.gallery { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:12px; margin:10px 0; }',
  '.gallery figure { border:1px solid #cbd9e4; border-radius:9px; padding:7px; margin:0; break-inside:avoid; page-break-inside:avoid; }',
  '.gallery img { display:block; width:100%; height:205px; object-fit:contain; background:#f5f8fa; border-radius:6px; }',
  '.gallery figcaption { overflow-wrap:anywhere; color:#435b70; margin-top:5px; font-size:10px; }',
  '.image-error { min-height:105px; display:flex; align-items:center; justify-content:center; padding:12px; background:#fff3e6; color:#9a3412; }',
  '.footer { border-top:1px solid #d2e1e8; margin-top:12px; padding:8px 0; color:#64748b; font-size:10px; }',
  '@media print { .toolbar { display:none !important; } .tour { break-before:page; page-break-before:always; } }',
].join('\n');

const info = (label: string, value: unknown) => '<div><small>' + esc(label) +
  '</small><strong>' + esc(value || '—') + '</strong></div>';

const safeImageUrl = (url: string | null | undefined) =>
  Boolean(url && (/^https?:\/\//i.test(url) || url.startsWith('/') || url.startsWith('data:image/')));

const loadImage = async (file: MosqueFieldVisitImage): Promise<Blob | null> => {
  if (file.fileId) return mosqueApi.mediaBlob(file.fileId);
  if (!file.url || !safeImageUrl(file.url)) return null;
  const response = await fetch(file.url, { credentials: 'same-origin' });
  if (!response.ok) return null;
  return response.blob();
};

const metaLine = (texts: Array<string | null | undefined>) =>
  texts.filter(Boolean).map((v) => esc(v)).join(' &nbsp; | &nbsp; ');

export const prepareTourBatchPrint = async (args: {
  popup: Window;
  title: string;
  entries: TourBatchReportEntry[];
  criteria: string[];
  mode: TourBatchImageMode;
}): Promise<void> => {
  const { popup, title, entries, criteria, mode } = args;
  const photos = collectTourReportPhotos(entries, mode);
  const urls: string[] = [];
  const loaded = new Map<string, string>();
  let missingImages = 0;
  let cleanupComplete = false;
  let watchClose: number | undefined;
  let expiry: number | undefined;

  const cleanup = () => {
    if (cleanupComplete) return;
    cleanupComplete = true;
    urls.forEach((url) => URL.revokeObjectURL(url));
    if (watchClose !== undefined) window.clearInterval(watchClose);
    if (expiry !== undefined) window.clearTimeout(expiry);
  };

  try {
    // Bounded concurrency protects the browser from large attachment collections.
    for (let start = 0; start < photos.length; start += 4) {
      if (popup.closed) { cleanup(); return; }
      await Promise.all(photos.slice(start, start + 4).map(async (photo) => {
        try {
          const blob = await loadImage(photo.file);
          if (!blob || (!blob.type.startsWith('image/') &&
              !/^image\//i.test(photo.file.mimeType || ''))) {
            missingImages++;
            return;
          }
          const url = URL.createObjectURL(blob);
          urls.push(url);
          loaded.set(photo.key, url);
        } catch {
          missingImages++;
        }
      }));
    }

    const byVisit = new Map<string, PhotoEntry[]>();
    for (const photo of photos) {
      const list = byVisit.get(photo.visitId) || [];
      list.push(photo);
      byVisit.set(photo.visitId, list);
    }

    const renderVisit = (visit: MosqueFieldVisit) => {
      const open = (visit.items || []).filter((item) => item.status === 'needs_action' &&
        item.resolutionStatus !== 'resolved' && item.resolutionStatus !== 'closed');
      const rows = (visit.items || []).map((item, i) => '<tr>' +
        [i + 1, item.category, item.title, itemStates[item.status] || item.status,
          priorityStates[item.priority] || item.priority,
          item.note || '—', item.responsibleEntity || '—', item.resolutionNote || '—']
          .map((v) => '<td>' + esc(v) + '</td>').join('') + '</tr>').join('');
      const selectedPhotos = byVisit.get(visit.id) || [];
      const gallery = selectedPhotos.length
        ? '<div class="gallery">' + selectedPhotos.map((photo) =>
          '<figure>' + (loaded.has(photo.key)
            ? '<img src="' + esc(loaded.get(photo.key)) + '" alt="' + esc(photo.caption) + '">'
            : '<div class="image-error">تعذر تحميل الصورة — راجع المرفق الأصلي</div>') +
          '<figcaption>' + esc(photo.caption) + (photo.file.fileName ? ' — ' + esc(photo.file.fileName) : '') +
          (photo.file.capturedAt ? ' — ' + esc(dateRiyadh(photo.file.capturedAt)) : '') +
          '</figcaption></figure>').join('') + '</div>'
        : (mode !== 'none' ? '<p class="muted tiny">لا توجد صور مطابقة لهذه الزيارة.</p>' : '');
      const pdfs = (visit.attachments || []).filter((file) =>
        file.mimeType === 'application/pdf' || /\.pdf$/i.test(file.fileName || ''));
      const pdfLabels = pdfs.length
        ? '<p class="muted tiny">مرفقات PDF غير المصورة: ' + esc(pdfs.map((file) =>
            file.fileName || 'مرفق PDF').join('، ')) + '</p>'
        : '';
      return '<section class="visit"><div class="visit-head"><h3>' +
        esc(visit.site.name) + ' — ' + esc(visit.visitNumber) + '</h3><p>' +
        metaLine([
          'النطاق: ' + (scopeStates[visit.visitScope] || visit.visitScope),
          'الحالة: ' + (visitStates[visit.workflowStatus] || visit.workflowStatus),
          'التاريخ: ' + dateRiyadh(visit.visitDate),
          'منشئ الزيارة: ' + (visit.createdByName || (visit.createdBy ? 'مستخدم سابق أو غير متاح' : 'غير مسجل')),
          'المسند إليه: ' + (visit.assignedToName || 'غير محدد'),
          ...(visit.lastEditedByName ? ['آخر تعديل بواسطة: ' + visit.lastEditedByName] : []),
          'ملاحظات مفتوحة: ' + open.length,
        ]) + '</p></div>' +
        '<div class="info">' +
          info('نوع الزيارة', visit.visitType === 'initial' ? 'أولية' : visit.visitType === 'follow_up' ? 'متابعة' : visit.visitType === 'urgent' ? 'عاجلة' : 'تحقق من الإغلاق') +
          info('ممثل الموقع', visit.representativeName) +
          info('الفريق الميداني', (visit.teamMembers || []).join('، ')) +
          info('الموقع / الحرم', [visit.site.campusLocation, visit.site.city, visit.site.district].filter(Boolean).join(' — ')) +
        '</div>' +
        '<table><thead><tr>' + ['م', 'المحور', 'بند الفحص', 'النتيجة', 'الأولوية', 'الملاحظات', 'الجهة المسؤولة', 'الإجراء / المعالجة'].map((x) =>
          '<th>' + esc(x) + '</th>').join('') + '</tr></thead><tbody>' +
        (rows || '<tr><td colspan="8">لا توجد نتائج فحص مسجلة لهذه الزيارة.</td></tr>') +
        '</tbody></table>' +
        '<div class="notes"><div><b>الملاحظات العامة</b><p>' + esc(visit.generalNotes || '—') +
        '</p></div><div><b>التوصيات</b><p>' + esc(visit.recommendations || '—') + '</p></div></div>' +
        gallery + pdfLabels + '</section>';
    };

    const tourMarkup = entries.map(({ tour, creatorName, visits }, index) => {
      const openIssues = visits.reduce((total, v) => total + (v.items || []).filter((item) =>
        item.status === 'needs_action' && !['resolved', 'closed'].includes(item.resolutionStatus)).length, 0);
      const imageTotal = visits.reduce((total, v) => total + (byVisit.get(v.id)?.length || 0), 0);
      return '<section class="tour"><div class="tour-head"><p class="kicker">تقرير الجولة ' + (index + 1) +
        ' من ' + entries.length + '</p><h2>' + esc(tour.title) + '</h2><p>' +
        metaLine(['رقم الجولة: ' + tour.tourNumber, 'الحالة: ' + (tourStates[tour.status] || tour.status),
          'التاريخ: ' + dateRiyadh(tour.scheduledDate)]) + '</p></div>' +
        '<div class="info">' +
          info('منشئ الجولة', creatorName) +
          (tour.lastEditedByName ? info('آخر تعديل بواسطة', tour.lastEditedByName) : '') +
          info('الفريق', (tour.teamMembers || []).join('، ')) +
          info('نطاق الجولة', tour.scope) +
          info('عدد الزيارات', String(visits.length)) +
          info('ملاحظات مفتوحة', String(openIssues)) +
          info('صور ضمن التقرير', String(imageTotal)) +
          info('ملاحظات الجولة', tour.notes) +
          info('تاريخ إنشاء السجل', dateRiyadh(tour.createdAt)) +
        '</div>' +
        (visits.length ? visits.map(renderVisit).join('') : '<p class="muted">لا توجد زيارات متاحة ضمن سجل هذه الجولة.</p>') +
        '<div class="footer">وحدة العناية بالمساجد والمصليات الجامعية — رقم الجولة: ' +
        esc(tour.tourNumber) + '</div></section>';
    }).join('');

    if (popup.closed) { cleanup(); return; }
    const totalVisits = entries.reduce((n, item) => n + item.visits.length, 0);
    const body = '<div class="toolbar"><span id="tour-print-status">يتم التحقق من جاهزية الصور للطباعة...</span>' +
      '<button id="tour-print-button" disabled type="button" onclick="window.print()">طباعة / حفظ PDF شامل</button></div>' +
      '<header class="cover"><div class="kicker">جامعة الإمام عبدالرحمن بن فيصل — وحدة العناية بالمساجد والمصليات الجامعية</div>' +
      '<h1>' + esc(title) + '</h1><p class="muted">تقرير موحد يتضمن تقريرًا مستقلًا لكل جولة، والزيارات التابعة لها وصورها.</p>' +
      '<div class="metrics">' +
      [
        ['الجولات', entries.length], ['الزيارات', totalVisits],
        ['المواقع', new Set(entries.flatMap((entry) => entry.visits.map((v) => v.siteId))).size],
        ['الصور المحددة', photos.length], ['صور تعذر جلبها', missingImages],
      ].map(([label, value]) => '<div class="metric"><small>' + esc(label) + '</small><strong>' +
        esc(value) + '</strong></div>').join('') + '</div>' +
      '<p>تاريخ إعداد التقرير: ' + esc(dateRiyadh(new Date().toISOString())) + ' — بتوقيت الرياض</p></header>' +
      '<div class="criteria"><b>معايير التصفية والفرز:</b> ' +
        esc(criteria.length ? criteria.join(' | ') : 'جميع الجولات المتاحة للمستخدم') + '</div>' +
      tourMarkup +
      '<div class="footer">تقرير توثيقي للزيارات والجولات المسجلة. لا يُعدّ الجدول المجدول تنفيذًا ميدانيًا مكتملًا.</div>';

    popup.document.open();
    popup.document.write(withReportPreparer('<!doctype html><html lang="ar" dir="rtl"><head>' +
      '<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">' +
      '<title>' + esc(title) + '</title><style>' + photoCss + '</style></head><body>' +
      body + '</body></html>'));
    popup.document.close();

    const images = Array.from(popup.document.images);
    await Promise.race([
      Promise.all(images.map(async (img) => {
        if (img.complete) return;
        await new Promise<void>((resolve) => {
          img.addEventListener('load', () => resolve(), { once: true });
          img.addEventListener('error', () => resolve(), { once: true });
        });
      })),
      new Promise<void>((resolve) => window.setTimeout(resolve, 20000)),
    ]);
    if (popup.closed) { cleanup(); return; }
    let failedDisplay = 0;
    for (const img of images) {
      if (img.complete && img.naturalWidth === 0) {
        const message = popup.document.createElement('div');
        message.className = 'image-error';
        message.textContent = 'تعذر عرض هذه الصورة في المتصفح؛ يرجى الرجوع إلى المرفق الأصلي.';
        img.replaceWith(message);
        failedDisplay++;
      }
    }
    const label = popup.document.getElementById('tour-print-status');
    if (label) label.textContent = missingImages + failedDisplay
      ? 'التقرير جاهز مع التنبيه: تعذر عرض ' + (missingImages + failedDisplay) + ' صورة، راجع مواضعها.'
      : 'التقرير جاهز — ' + entries.length + ' جولة و' + totalVisits + ' زيارة.';
    const button = popup.document.getElementById('tour-print-button') as HTMLButtonElement | null;
    if (button) button.disabled = false;

    popup.addEventListener('afterprint', () => {
      cleanup();
      if (!popup.closed) popup.close();
    }, { once: true });
    watchClose = window.setInterval(() => { if (popup.closed) cleanup(); }, 2000);
    expiry = window.setTimeout(() => {
      cleanup();
      if (!popup.closed) popup.close();
    }, 20 * 60 * 1000);
    popup.focus();
  } catch (error) {
    cleanup();
    if (!popup.closed) popup.close();
    throw error;
  }
};
