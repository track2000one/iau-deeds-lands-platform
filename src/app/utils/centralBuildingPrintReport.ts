import { mosqueApi, type MosqueBuilding, type CentralBuildingPhoto } from '../api/mosques';
import { reportPreparerName } from './reportAttribution';

type PrintablePhoto = { photo: CentralBuildingPhoto; src: string | null };

const escapeHtml = (value: unknown): string =>
  String(value === null || value === undefined || value === '' ? '—' : value)
    .replace(/[&<>"']/g, (char) => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;',
    })[char] || char);

const formatNumber = (value: number | null | undefined, suffix = ''): string =>
  value == null ? '—' : `${value.toLocaleString('ar-SA')}${suffix}`;

const formatDate = (value?: string | null): string => {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleString('ar-SA-u-ca-gregory');
};

const operationalStatusLabels: Record<string, string> = {
  active: 'نشط',
  maintenance: 'تحت الصيانة',
  under_construction: 'تحت الإنشاء',
  temporarily_closed: 'مغلق مؤقتًا',
  out_of_service: 'خارج الخدمة',
};

const field = (label: string, value: unknown, wide = false): string =>
  `<div class="field${wide ? ' wide' : ''}"><span class="label">${escapeHtml(label)}</span><b>${escapeHtml(value)}</b></div>`;

const section = (title: string, content: string): string =>
  `<section class="section"><h2>${escapeHtml(title)}</h2><div class="detail-grid">${content}</div></section>`;

const summaryCard = (label: string, value: unknown): string =>
  `<div class="summary-card"><span>${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong></div>`;

export const createCentralBuildingReportHtml = (
  building: MosqueBuilding,
  photos: PrintablePhoto[],
  preparer: string,
): string => {
  const title = building.name || building.buildingNumber;
  const status = operationalStatusLabels[building.operationalStatus || ''] || 'غير محدد';
  const coords = building.latitude == null || building.longitude == null
    ? '—'
    : `${building.latitude}, ${building.longitude}`;
  const generatedAt = new Date().toLocaleString('ar-SA-u-ca-gregory');

  const summary = [
    ['رقم المبنى', building.buildingNumber],
    ['عدد الأدوار', formatNumber(building.floorsCount)],
    ['المساحة المبنية', formatNumber(building.builtUpArea, ' م²')],
    ['رقم الصك', building.deed?.deedNumber || 'غير مرتبط'],
    ['الاستخدام الرئيسي', building.primaryUse || 'غير محدد'],
    ['حالة المبنى', status],
  ].map(([label, value]) => summaryCard(String(label), value)).join('');

  const basics = [
    field('اسم المبنى', building.name || '—'),
    field('رقم المبنى', building.buildingNumber),
    field('نوع المبنى', building.buildingType),
    field('الاستخدام الرئيسي', building.primaryUse),
    field('الحالة التشغيلية', status),
    field('سنة الإنشاء', building.constructionYear),
    field('عدد الأدوار', formatNumber(building.floorsCount)),
    field('الأدوار السفلية', formatNumber(building.basementFloorsCount)),
    field('المساحة المبنية', formatNumber(building.builtUpArea, ' م²')),
    field('مساحة الأرض', formatNumber(building.landArea, ' م²')),
    field('الغرف', formatNumber(building.roomsCount)),
    field('المداخل', formatNumber(building.entrancesCount)),
    field('المصاعد', formatNumber(building.elevatorsCount)),
    field('مواقف السيارات', formatNumber(building.parkingSpaces)),
    field('إتاحة الوصول', building.hasAccessibility == null ? 'غير محدد' : building.hasAccessibility ? 'متاحة' : 'غير متاحة'),
  ].join('');

  const mapUrl = building.latitude != null && building.longitude != null
    ? `https://www.google.com/maps?q=${encodeURIComponent(`${building.latitude},${building.longitude}`)}`
    : '';
  const locationFields = [
    field('الحرم / الموقع الجامعي', building.campusLocation),
    field('المنطقة', building.region),
    field('المدينة', building.city),
    field('الحي', building.district),
    field('إحداثيات الموقع', coords, true),
  ].join('');
  const locationHtml = section('الموقع الجغرافي', locationFields) +
    (mapUrl ? `<div class="map-link"><a href="${escapeHtml(mapUrl)}" rel="noreferrer" target="_blank">فتح موقع المبنى على الخريطة</a></div>` : '');

  const deedFields = [
    field('رقم الصك', building.deed?.deedNumber || 'غير مرتبط'),
    field('نوع الملكية', building.ownershipType),
    field('وصف العقار في الصك', building.deed?.propertyDescription, true),
    field('رقم القطعة', building.deed?.plotNumber),
    field('رقم المخطط', building.deed?.planNumber),
    field('المساحة الواردة في الصك', formatNumber(building.deed?.area, ' م²')),
  ].join('');

  const administrationFields = [
    field('أنشأ السجل', building.createdByName || (building.createdBy ? 'مستخدم سابق' : 'سجل قديم غير منسوب')),
    field('تاريخ إنشاء السجل', formatDate(building.createdAt)),
    field('تاريخ آخر تحديث', formatDate(building.updatedAt)),
    field('أُعدّ بواسطة', preparer),
    field('تاريخ إعداد التقرير', generatedAt),
  ].join('');

  const photosHtml = photos.length
    ? `<section class="photos-section">
        <div class="photo-heading"><h2>الصور المرفقة للمبنى</h2><span>${photos.length} صورة</span></div>
        <div class="photo-grid">${photos.map(({ photo, src }, index) =>
          `<figure class="photo-card">${src
            ? `<img src="${escapeHtml(src)}" alt="${escapeHtml(photo.fileName || `صورة ${index + 1}`)}" />`
            : '<div class="photo-error">تعذّر تحميل الصورة من السجل</div>'
          }<figcaption>${index + 1}. ${escapeHtml(photo.fileName || 'صورة المبنى')}</figcaption></figure>`
        ).join('')}</div>
      </section>`
    : '';

  return `<!doctype html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>تقرير مبنى — ${escapeHtml(title)}</title>
  <style>
    @page {
      size: A4 landscape;
      margin: 10mm;
      @bottom-left { content: "صفحة " counter(page) " من " counter(pages); font: 9px Tahoma, Arial; color: #64748b; }
    }
    * { box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    body { font-family: Tahoma, Arial, sans-serif; direction: rtl; color: #172b3a; background: #fff; margin: 0; font-size: 11px; line-height: 1.6; }
    .toolbar { display: flex; align-items: center; justify-content: space-between; gap: 10px; padding: 11px 14px; background: #e8f2f7; border: 1px solid #d1e2ea; margin-bottom: 13px; border-radius: 10px; }
    .toolbar div { display: flex; gap: 8px; flex-wrap: wrap; }
    .toolbar button { border: 0; background: #075985; color: white; border-radius: 8px; padding: 9px 16px; font: 700 12px Tahoma, Arial; cursor: pointer; }
    .toolbar button.secondary { background: #fff; color: #172b3a; border: 1px solid #b7c9d4; }
    .report-header { padding: 17px 20px; border: 2px solid #0f766e; border-radius: 15px; background: linear-gradient(120deg,#eafaf4,#fff,#eef6ff); break-inside: avoid; }
    .brand { color: #0f766e; font-size: 12px; font-weight: 800; }
    .header-row { display: flex; justify-content: space-between; align-items: center; gap: 12px; margin-top: 7px; }
    h1 { font-size: 24px; line-height: 1.5; font-weight: 900; margin: 0; color: #122f46; }
    .subtitle { font-size: 13px; color: #475569; margin: 1px 0 0; }
    .status { display: inline-block; flex-shrink: 0; font-weight: 800; padding: 6px 12px; border: 1px solid #99d5c0; border-radius: 99px; color: #075d4c; background: #ecfdf5; }
    .meta { display: flex; gap: 14px; flex-wrap: wrap; border-top: 1px solid #d0e4e5; padding-top: 9px; margin-top: 12px; color: #475569; font-size: 10px; }
    .meta strong { color: #102e45; }
    .summary { display: grid; grid-template-columns: repeat(3,minmax(0,1fr)); gap: 9px; margin: 13px 0; }
    .summary-card { border: 1px solid #ccdce7; border-radius: 12px; padding: 11px 13px; min-height: 65px; break-inside: avoid; background: #f8fbfd; }
    .summary-card span { display: block; font-size: 10px; color: #64748b; }
    .summary-card strong { display: block; font-size: 16px; color: #123b5a; line-height: 1.45; overflow-wrap: anywhere; }
    .section { margin: 12px 0 0; border: 1px solid #d1dee9; border-radius: 12px; overflow: hidden; break-inside: avoid; }
    .section h2 { background: #ecf4f9; color: #123f5b; padding: 9px 13px; font-size: 14px; margin: 0; border-bottom: 1px solid #d1dee9; }
    .detail-grid { display: grid; grid-template-columns: repeat(3,minmax(0,1fr)); gap: 0; }
    .field { border-left: 1px solid #e3eaf0; border-bottom: 1px solid #e3eaf0; padding: 8px 11px; min-height: 48px; overflow-wrap: anywhere; }
    .field.wide { grid-column: 1 / -1; }
    .field .label { display: block; color: #708397; font-size: 10px; margin-bottom: 3px; }
    .field b { font-size: 12px; color: #142e42; font-weight: 800; }
    .map-link { margin: 6px 12px 11px; font-size: 10px; }
    .map-link a { color: #0369a1; text-decoration: underline; }
    .notes { border: 1px solid #d1dee9; border-radius: 10px; background: #fafcfe; white-space: pre-wrap; padding: 11px 13px; font-size: 11px; margin-top: 11px; }
    .notes h2 { margin: 0 0 5px; font-size: 13px; color: #123f5b; }
    .photos-section { margin-top: 14px; break-before: auto; }
    .photo-heading { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #0f766e; margin-bottom: 9px; padding-bottom: 6px; }
    .photo-heading h2 { font-size: 17px; color: #0f493e; margin: 0; }
    .photo-heading span { font-size: 11px; color: #64748b; }
    .photo-grid { display: grid; grid-template-columns: repeat(3,minmax(0,1fr)); gap: 10px; }
    .photo-card { margin: 0; border: 1px solid #d1dee9; border-radius: 10px; padding: 7px; break-inside: avoid; background: #fff; }
    .photo-card img { width: 100%; height: 175px; display: block; object-fit: contain; background: #f1f5f9; border-radius: 7px; }
    .photo-error { height: 175px; background: #fff7ed; color: #9a3412; display: flex; align-items: center; justify-content: center; padding: 12px; text-align: center; }
    .photo-card figcaption { padding: 6px 2px 1px; font-size: 10px; color: #475569; overflow-wrap: anywhere; }
    .footer { display: flex; justify-content: space-between; gap: 12px; border-top: 1px solid #dbe5ed; margin-top: 14px; padding: 10px 2px 2px; font-size: 9px; color: #64748b; }
    @media print { .toolbar { display: none !important; } body { font-size: 10px; } .section,.summary-card,.photo-card { box-shadow: none; } }
  </style>
</head>
<body>
  <div class="toolbar">
    <span>معاينة التقرير — راجع البيانات والصور قبل الطباعة</span>
    <div><button type="button" onclick="window.print()">طباعة / حفظ PDF</button><button type="button" class="secondary" onclick="window.close()">إغلاق</button></div>
  </div>
  <header class="report-header">
    <div class="brand">جامعة الإمام عبدالرحمن بن فيصل — إدارة أوقاف وأملاك الجامعة</div>
    <div class="header-row">
      <div><h1>بطاقة السجل المركزي للمبنى</h1><p class="subtitle">${escapeHtml(title)} — رقم المبنى: ${escapeHtml(building.buildingNumber)}</p></div>
      <span class="status">${escapeHtml(status)}</span>
    </div>
    <div class="meta"><span>أُعدّ بواسطة: <strong>${escapeHtml(preparer)}</strong></span><span>تاريخ الإعداد: <strong>${escapeHtml(generatedAt)}</strong></span><span>المصدر: <strong>السجل المركزي للمباني</strong></span></div>
  </header>

  <div class="summary">${summary}</div>
  ${section('البيانات الأساسية والتشغيلية', basics)}
  ${locationHtml}
  ${section('بيانات الملكية والصك', deedFields)}
  ${section('التوثيق الإداري', administrationFields)}
  ${building.notes ? `<section class="notes"><h2>الملاحظات العامة</h2>${escapeHtml(building.notes)}</section>` : ''}
  ${photosHtml}
  <footer class="footer"><span>منصة إدارة الصكوك والأراضي — السجل المركزي للمباني</span><span>أُعدّ بواسطة: ${escapeHtml(preparer)} · ${escapeHtml(generatedAt)}</span></footer>
</body>
</html>`;
};

export const printCentralBuildingReport = async (building: MosqueBuilding): Promise<boolean> => {
  // Open the popup before any await: otherwise browsers may block it.
  const popup = window.open('', '_blank', 'width=1350,height=900');
  if (!popup) return false;

  popup.document.open();
  popup.document.write('<!doctype html><html lang="ar" dir="rtl"><meta charset="utf-8"><title>إعداد تقرير المبنى</title><body style="font:16px Tahoma,Arial;padding:42px;color:#123047"><h2>جاري إعداد تقرير المبنى وتحميل صوره…</h2></body></html>');
  popup.document.close();

  const objectUrls: string[] = [];
  const cleanup = () => objectUrls.splice(0).forEach((url) => URL.revokeObjectURL(url));
  let cleanupTimer: number | undefined;
  try {
    const photos = await Promise.all((building.photos || []).map(async (photo): Promise<PrintablePhoto> => {
      try {
        const blob = await mosqueApi.buildingPhotoBlob(building.id, photo.id);
        // Some authenticated storage gateways return images as octet-stream.
        const imageBlob = blob.type.startsWith('image/')
          ? blob
          : new Blob([blob], { type: photo.mimeType || 'image/jpeg' });
        const src = URL.createObjectURL(imageBlob);
        objectUrls.push(src);
        return { photo, src };
      } catch {
        return { photo, src: null };
      }
    }));

    if (popup.closed) {
      cleanup();
      return true;
    }

    popup.document.open();
    popup.document.write(createCentralBuildingReportHtml(building, photos, reportPreparerName()));
    popup.document.close();

    // Wait for the browser to decode the authenticated image blobs.
    const images = Array.from(popup.document.images);
    await Promise.race([
      Promise.all(images.map((image) => {
        if (image.complete) return Promise.resolve();
        return new Promise<void>((resolve) => {
          image.addEventListener('load', () => resolve(), { once: true });
          image.addEventListener('error', () => resolve(), { once: true });
        });
      })),
      new Promise<void>((resolve) => window.setTimeout(resolve, 5000)),
    ]);

    popup.onafterprint = () => {
      if (cleanupTimer !== undefined) window.clearTimeout(cleanupTimer);
      cleanup();
      popup.close();
    };
    cleanupTimer = window.setTimeout(cleanup, 5 * 60 * 1000);
    if (!popup.closed) {
      popup.focus();
      popup.print();
    }
    return true;
  } catch (error) {
    cleanup();
    if (!popup.closed) popup.close();
    throw error;
  }
};
