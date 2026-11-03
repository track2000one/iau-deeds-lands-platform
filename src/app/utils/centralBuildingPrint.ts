import type { MosqueBuilding } from '../api/mosques';
import { mosqueApi } from '../api/mosques';

// Unified print style with the university mosque-unit field-visit reports.
// This module reads existing records; it does not alter a building or its attachments.

type PhotoRow = { name: string; url: string | null };
const HTML_ENTITIES: Record<string, string> = {
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
};
const escapeHtml = (value: unknown): string =>
  String(value === null || value === undefined || value === '' ? '—' : value)
    .replace(/[&<>"']/g, (character) => HTML_ENTITIES[character] || character);

const numberText = (value: number | null | undefined, suffix = ''): string =>
  value === null || value === undefined
    ? 'غير مسجل'
    : new Intl.NumberFormat('ar-SA', { maximumFractionDigits: 2 }).format(value) + suffix;

const dateText = (value?: string | null): string => {
  if (!value) return 'غير مسجل';
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? 'غير مسجل'
    : date.toLocaleDateString('ar-SA-u-ca-gregory', { year: 'numeric', month: 'long', day: 'numeric' });
};

const buildingTypeNames: Record<string, string> = {
  academic: 'أكاديمي / تعليمي',
  administrative: 'إداري',
  healthcare: 'صحي',
  residential: 'سكني',
  service: 'خدمات ومرافق',
  warehouse: 'مستودع',
  parking: 'مواقف',
  mixed: 'متعدد الاستخدام',
  other: 'أخرى',
};
const buildingStatusNames: Record<string, string> = {
  active: 'عامل / مستخدم',
  maintenance: 'تحت الصيانة',
  under_construction: 'تحت الإنشاء',
  temporarily_closed: 'مغلق مؤقتًا',
  out_of_service: 'خارج الخدمة',
};
const ownershipNames: Record<string, string> = {
  owned: 'مملوك للجامعة',
  allocated: 'مخصص للجامعة',
  leased: 'مستأجر',
  operated: 'تحت التشغيل / الإدارة',
  other: 'أخرى',
};

const informationSection = (title: string, fields: Array<[string, unknown]>): string =>
  '<section class="section"><h2>' + escapeHtml(title) + '</h2><div class="details">' +
  fields.map(([label, value]) =>
    '<div class="detail"><small>' + escapeHtml(label) + '</small><strong>' +
    escapeHtml(value) + '</strong></div>').join('') + '</div></section>';

const metric = (label: string, value: unknown, unit = '') =>
  '<div class="metric"><span>' + escapeHtml(label) + '</span><strong>' +
  escapeHtml(value) + '</strong>' + (unit ? '<small>' + escapeHtml(unit) + '</small>' : '') + '</div>';

const style = [
  '@page{size:A4 landscape;margin:11mm}',
  '*{box-sizing:border-box;-webkit-print-color-adjust:exact;print-color-adjust:exact}',
  'html{direction:rtl}body{margin:0;background:#edf4f5;color:#193149;font:12px/1.8 Tahoma,Arial,sans-serif}',
  'main{max-width:1250px;margin:14px auto;padding:18px;background:#fff;border-radius:13px}',
  '.toolbar{max-width:1250px;margin:14px auto 0;background:#fff;border:1px solid #c9d8dd;border-radius:10px;padding:10px 18px;display:flex;justify-content:space-between;align-items:center;gap:14px}',
  '.toolbar button{background:#0e665d;color:#fff;padding:9px 19px;font-weight:800;border:0;border-radius:9px;cursor:pointer}',
  '.head{position:relative;border:2px solid #117a70;border-radius:15px;background:#eefaf8;padding:17px 20px 15px;break-inside:avoid}',
  '.head:before{content:"";position:absolute;right:0;top:0;bottom:0;background:#117a70;width:6px;border-radius:0 13px 13px 0}',
  '.kicker{font-size:12px;font-weight:800;color:#116a62;letter-spacing:.1px}',
  'h1{font-size:24px;color:#123850;margin:4px 0 0;font-weight:900}',
  '.subtitle{color:#5c7181;font-size:11px}',
  '.head-meta{display:flex;gap:10px;flex-wrap:wrap;margin-top:13px}',
  '.pill{border:1px solid #b7d6d1;background:#fff;padding:5px 11px;border-radius:22px;color:#193b4a;font-weight:700}',
  '.metrics{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px;margin:13px 0}',
  '.metric{border:1px solid #c9d8dd;border-radius:11px;background:#f8fbfb;padding:9px 12px;text-align:center;min-height:77px;break-inside:avoid}',
  '.metric span{display:block;font-size:11px;color:#647989;font-weight:700}',
  '.metric strong{display:inline-block;font-size:20px;font-weight:900;color:#0d625b;line-height:1.7;margin-top:2px}',
  '.metric small{margin-right:5px;color:#647989}',
  '.section{margin-top:14px;break-inside:avoid-page}',
  '.section h2{font-size:14px;color:#0d635d;margin:0 0 8px;border-right:4px solid #13a69b;padding:3px 10px;background:#f1f8f8}',
  '.details{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px}',
  '.detail{border:1px solid #cbdce0;background:#fff;border-radius:9px;padding:8px 11px;min-height:54px;overflow-wrap:anywhere;break-inside:avoid}',
  '.detail small{display:block;color:#627688;font-size:10px;margin-bottom:2px}',
  '.detail strong{font-weight:800;color:#1b3345;font-size:12px;white-space:pre-wrap}',
  '.notes{border:1px solid #cadbdd;border-radius:10px;padding:12px;background:#fafcfc;min-height:55px;white-space:pre-wrap;overflow-wrap:anywhere}',
  '.warning{background:#fff9ed;color:#755317;border:1px solid #ead6a6;border-radius:9px;padding:9px 12px;font-size:11px;margin-top:12px}',
  '.photos{break-before:page;margin-top:7mm}',
  '.photos h2{font-size:18px;color:#0d635d;border-bottom:2px solid #117a70;padding-bottom:7px;margin-top:0}',
  '.photo-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px}',
  '.photo-card{border:1px solid #cbdce0;border-radius:10px;padding:8px;break-inside:avoid;page-break-inside:avoid}',
  '.photo-card img{height:190px;width:100%;object-fit:contain;display:block;background:#f3f7f8;border-radius:7px}',
  '.photo-placeholder{height:190px;display:flex;align-items:center;justify-content:center;background:#faf4ee;color:#885c22}',
  '.photo-card figcaption{padding:5px 2px 0;font-size:11px;color:#4e6574;overflow-wrap:anywhere}',
  '.signature{display:flex;justify-content:space-between;gap:20px;margin-top:18px}',
  '.signature div{width:45%;border-top:1px solid #7f9aa6;padding-top:7px;font-size:11px;color:#455f70}',
  'footer{display:flex;justify-content:space-between;gap:12px;border-top:1px solid #b7cbd1;margin-top:16px;padding-top:8px;color:#5d7080;font-size:10px}',
  '@media(max-width:750px){.metrics,.details{grid-template-columns:repeat(2,minmax(0,1fr))}.photo-grid{grid-template-columns:repeat(2,minmax(0,1fr))}}',
  '@media print{body{background:#fff}main{margin:0;padding:0;max-width:none;border-radius:0}.toolbar{display:none}.section{margin-top:10px}.details{gap:6px}.detail{padding:6px 9px}.metrics{margin:10px 0}.head{padding:12px 16px}h1{font-size:21px}.photo-card img,.photo-placeholder{height:170px}}',
].join('\n');

const printHtml = (building: MosqueBuilding, preparedBy: string, photos: PhotoRow[]): string => {
  const present = (value?: string | null) => value?.trim() || 'غير مسجل';
  const coordinateText =
    building.latitude == null || building.longitude == null
      ? 'غير مسجلة'
      : String(building.latitude) + ' ، ' + String(building.longitude);
  const deedNumber = building.deed?.deedNumber || 'غير مرتبط بصك';
  const pending = building.buildingNumber.startsWith('IMP-');
  const photosUnavailable = photos.filter((photo) => !photo.url).length;
  const location = [building.campusLocation, building.city, building.district]
    .filter(Boolean).join(' — ') || 'موقع غير محدد';
  const reportDate = dateText(new Date().toISOString());

  const photoSection = photos.length
    ? '<section class="photos"><h2>التوثيق المصوّر للمبنى (' + photos.length + ')</h2>' +
      (photosUnavailable ? '<p class="warning">تعذّر عرض ' + photosUnavailable + ' من الصور المرفقة. الصور المتاحة فقط تظهر في التقرير.</p>' : '') +
      '<div class="photo-grid">' +
      photos.map((photo, index) =>
        '<figure class="photo-card">' +
        (photo.url ? '<img alt="صورة المبنى" src="' + escapeHtml(photo.url) + '">' :
          '<div class="photo-placeholder">الصورة غير متاحة للعرض</div>') +
        '<figcaption>' + (index + 1) + '. ' + escapeHtml(photo.name) + '</figcaption></figure>').join('') +
      '</div></section>'
    : '';

  return [
    '<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8">',
    '<meta name="viewport" content="width=device-width,initial-scale=1"><title>',
    escapeHtml('بطاقة المبنى — ' + building.buildingNumber), '</title><style>', style,
    '</style></head><body><div class="toolbar"><b>معاينة بطاقة المبنى قبل الطباعة أو الحفظ بصيغة PDF</b>',
    '<button type="button" onclick="window.print()">طباعة / حفظ PDF</button></div><main>',
    '<header class="head"><div class="kicker">جامعة الإمام عبدالرحمن بن فيصل — إدارة أوقاف وأملاك الجامعة</div>',
    '<h1>بطاقة تعريف المبنى — السجل المركزي للمباني</h1>',
    '<div class="subtitle">تقرير تعريفي مستخرج من منصة إدارة الصكوك والأراضي</div>',
    '<div class="head-meta"><span class="pill">رمز المبنى: ', escapeHtml(building.buildingNumber), '</span>',
    '<span class="pill">', escapeHtml(building.name || 'المسمى غير مسجل'), '</span>',
    '<span class="pill">', escapeHtml(building.campusLocation || 'الحرم غير محدد'), '</span>',
    '<span class="pill">', pending ? 'سجل مستورد بحاجة إلى مراجعة' : 'سجل مركزي', '</span></div></header>',
    '<div class="metrics">',
    metric('عدد الأدوار', numberText(building.floorsCount)),
    metric('مساحة الأرض', numberText(building.landArea), 'م²'),
    metric('المساحة المبنية', numberText(building.builtUpArea), 'م²'),
    metric('الصور المرفقة', numberText(photos.length)),
    '</div>',
    informationSection('أولًا: التعريف والموقع', [
      ['رمز المبنى', building.buildingNumber],
      ['اسم المبنى / الموقع', present(building.name)],
      ['الحرم الجامعي', present(building.campusLocation)],
      ['الحي', present(building.district)],
      ['المدينة', present(building.city)],
      ['المنطقة', present(building.region)],
      ['الموقع الإداري', location],
      ['رقم الصك المرتبط', deedNumber],
      ['خط العرض', building.latitude == null ? 'غير مسجل' : String(building.latitude)],
      ['خط الطول', building.longitude == null ? 'غير مسجل' : String(building.longitude)],
      ['الإحداثيات المجمعة', coordinateText],
      ['حالة مطابقة الصك', building.deed ? 'مرتبط بسجل صك' : 'يتطلب مراجعة الصك'],
    ]),
    informationSection('ثانيًا: التكوين والمساحات', [
      ['عدد الأدوار', numberText(building.floorsCount)],
      ['الأدوار السفلية (القبو)', numberText(building.basementFloorsCount)],
      ['مساحة الأرض', numberText(building.landArea, ' م²')],
      ['المساحة المبنية الإجمالية', numberText(building.builtUpArea, ' م²')],
      ['عدد الغرف / الوحدات', numberText(building.roomsCount)],
      ['المداخل', numberText(building.entrancesCount)],
      ['المصاعد', numberText(building.elevatorsCount)],
      ['مواقف السيارات', numberText(building.parkingSpaces)],
    ]),
    informationSection('ثالثًا: الاستخدام والوضع التشغيلي', [
      ['نوع المبنى', buildingTypeNames[building.buildingType || ''] || present(building.buildingType)],
      ['الاستخدام الرئيسي', present(building.primaryUse)],
      ['الحالة التشغيلية', buildingStatusNames[building.operationalStatus || ''] || present(building.operationalStatus)],
      ['صفة الإشغال / الملكية المسجلة', ownershipNames[building.ownershipType || ''] || present(building.ownershipType)],
      ['سنة الإنشاء', numberText(building.constructionYear)],
      ['تهيئة الوصول لذوي الإعاقة', building.hasAccessibility == null ? 'غير مسجل' : (building.hasAccessibility ? 'مهيأ' : 'غير مهيأ')],
      ['عدد المساجد والمصليات المرتبطة', numberText(building._count?.sites ?? building.sites?.length)],
      ['عدد المعاينات المرتبطة', numberText(building._count?.siteInspections)],
    ]),
    '<section class="section"><h2>رابعًا: الملاحظات</h2><div class="notes">',
    escapeHtml(building.notes?.trim() || 'لا توجد ملاحظات مسجلة لهذا المبنى.'),
    '</div></section>',
    informationSection('خامسًا: التوثيق والمسؤولية', [
      ['أنشأ السجل', present(building.createdByName) || 'غير مسجل'],
      ['تاريخ إنشاء السجل', dateText(building.createdAt)],
      ['آخر تحديث', dateText(building.updatedAt)],
      ['أُعد التقرير بواسطة', preparedBy],
      ['تاريخ إعداد التقرير', reportDate],
      ['حالة السجل', pending ? 'بانتظار مراجعة الاستيراد' : 'مدرج في السجل المركزي'],
    ]),
    '<div class="warning">تنبيه: هذه البطاقة تعكس البيانات المسجلة في المنصة وقت إعداد التقرير، ',
    'ولا تُعد صكًا أو إثباتًا مستقلًا للملكية أو المساحة المساحية المعتمدة. ',
    'تُراجع حدود العقار والمعلومات النظامية بالوثائق والمخططات المعتمدة.</div>',
    '<div class="signature"><div>المعد / المسؤول عن التوثيق: ', escapeHtml(preparedBy),
    '</div><div>المراجعة / الاعتماد: ....................................</div></div>',
    photoSection,
    '<footer><span>منصة إدارة الصكوك والأراضي — السجل المركزي للمباني</span>',
    '<span>رقم المبنى: ', escapeHtml(building.buildingNumber), ' | تاريخ التقرير: ', escapeHtml(reportDate),
    '</span></footer></main></body></html>',
  ].join('');
};

const loadPhotoRows = async (building: MosqueBuilding): Promise<{ rows: PhotoRow[]; objectUrls: string[] }> => {
  const photos = Array.isArray(building.photos) ? building.photos : [];
  const rows: PhotoRow[] = photos.map((photo) => ({ name: photo.fileName || 'صورة المبنى', url: null }));
  const objectUrls: string[] = [];
  let cursor = 0;
  const workers = Array.from({ length: Math.min(3, photos.length) }, async () => {
    while (cursor < photos.length) {
      const index = cursor++;
      const photo = photos[index];
      try {
        const blob = await mosqueApi.buildingPhotoBlob(building.id, photo.id);
        if (!blob.type.startsWith('image/') || blob.size > 15 * 1024 * 1024) continue;
        const blobUrl = URL.createObjectURL(blob);
        objectUrls.push(blobUrl);
        rows[index].url = blobUrl;
      } catch {
        // A missing private attachment should not prevent printing the building's recorded data.
      }
    }
  });
  await Promise.all(workers);
  return { rows, objectUrls };
};

const waitForPictures = async (popup: Window): Promise<void> => {
  const images = Array.from(popup.document.images);
  await Promise.all(images.map((img) => {
    if (img.complete) return Promise.resolve();
    return new Promise<void>((resolve) => {
      const done = () => resolve();
      img.addEventListener('load', done, { once: true });
      img.addEventListener('error', done, { once: true });
      // Printing must continue even if a browser decoder cannot display a photo.
      setTimeout(resolve, 6000);
    });
  }));
};

export const openCentralBuildingReport = async (building: MosqueBuilding, preparedBy: string): Promise<boolean> => {
  // Open immediately from the click event, before asynchronous private-photo reads.
  const popup = window.open('', '_blank', 'width=1200,height=850');
  if (!popup) return false;

  popup.document.open();
  popup.document.write('<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><title>تجهيز بطاقة المبنى</title></head><body style="font:16px Tahoma,Arial,sans-serif;padding:50px">جارٍ إعداد بطاقة المبنى والصور المرفقة...</body></html>');
  popup.document.close();

  let objectUrls: string[] = [];
  try {
    const photos = await loadPhotoRows(building);
    objectUrls = photos.objectUrls;
    if (popup.closed) return true;
    popup.document.open();
    popup.document.write(printHtml(building, preparedBy || 'غير محدد', photos.rows));
    popup.document.close();
    await waitForPictures(popup);
    if (!popup.closed) {
      popup.focus();
      popup.print();
    }
    return true;
  } catch (error) {
    if (!popup.closed) {
      popup.document.body.textContent = 'تعذّر إعداد بطاقة المبنى. يرجى إعادة المحاولة.';
    }
    throw error;
  } finally {
    // Keep blob images available if the user chooses to print again from the preview.
    if (objectUrls.length) setTimeout(() => objectUrls.forEach((url) => URL.revokeObjectURL(url)), 10 * 60 * 1000);
  }
};
