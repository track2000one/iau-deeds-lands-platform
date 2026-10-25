import type { MosqueFieldVisit, MosqueFieldVisitItem } from '../api/mosques';

export type MosqueNeedPreset = 'carpet' | 'air' | 'lighting' | 'cleaning' | 'quran' | 'custom' | 'all';
export type MosqueNeedStatus = 'open' | 'resolved' | 'all';
export type MosqueNeedSort = 'site' | 'priority' | 'date';

export const mosqueNeedPresets: { value: MosqueNeedPreset; label: string }[] = [
  { value: 'carpet', label: 'احتياج فرش أو سجاد جديد' },
  { value: 'air', label: 'التكييف والتهوية' },
  { value: 'lighting', label: 'الإنارة والكهرباء' },
  { value: 'cleaning', label: 'النظافة' },
  { value: 'quran', label: 'المصاحف والتجهيزات المرتبطة بها' },
  { value: 'custom', label: 'بحث بكلمة أو احتياج مخصص' },
  { value: 'all', label: 'جميع أنواع الاحتياج' },
];

export type MosqueNeedEvidence = {
  siteId: string;
  siteName: string;
  siteType: string;
  visitNumber: string;
  visitDate: string;
  visitScope: string;
  itemTitle: string;
  category: string;
  note: string;
  priority: string;
  resolutionStatus: string;
  responsibleEntity: string;
};

export type MosqueNeedSummary = {
  siteId: string;
  siteName: string;
  siteType: string;
  latestVisit: string;
  latestDate: string;
  priority: string;
  evidence: MosqueNeedEvidence[];
};

const normalize = (text: unknown): string => String(text || '').normalize('NFKC')
  .toLocaleLowerCase('ar')
  .replace(/[\u064b-\u065f\u0670\u0640]/g, '')
  .replace(/[أإآ]/g, 'ا')
  .replace(/ى/g, 'ي')
  .replace(/\s+/g, ' ')
  .trim();

// A checklist item named "نظافة السجاد والأرضيات" is NOT in itself a request to supply carpets.
// Identify an explicit supply, replacement or installation request in the actual note or recommendation.
export const isExplicitCarpetNeed = (source: unknown): boolean => {
  const text = normalize(source);
  const carpet = /(?:فرش|سجاد|موكيت|سجاده)/;
  const procurement = /(?:توريد|تركيب|تجديد|تبديل|تغيير|استبدال|شراء|توفير|تأمين|نقص|ناقص|جديد|تالف|مهترئ|متهالك|غير متوفر|لا يوجد|بحاجه|يحتاج|تحتاج|اعاده فرش)/;
  if (!carpet.test(text) || !procurement.test(text)) return false;
  const isCleaningOnly = /(?:تنظيف|غسيل|مكنسه|تكنيس|اتساخ|اوساخ|نظافه)/.test(text)
    && !/(?:توريد|تركيب|تجديد|تبديل|تغيير|استبدال|شراء|توفير|تأمين|نقص|ناقص|جديد|تالف|مهترئ|متهالك|غير متوفر|لا يوجد|اعاده فرش)/.test(text);
  return !isCleaningOnly;
};

const priorityRank: Record<string, number> = { low: 1, normal: 2, medium: 3, high: 4, urgent: 5 };
const isResolved = (item: MosqueFieldVisitItem) => ['resolved', 'closed'].includes(item.resolutionStatus);
const matchesState = (item: MosqueFieldVisitItem, state: MosqueNeedStatus) =>
  (item.status === 'needs_action' || item.status === 'not_available')
  && (state === 'all' || (state === 'open' ? !isResolved(item) : isResolved(item)));

// The same definitions power every category in the dropdown, including items written
// in free-text notes. A category name alone does not turn a good item into an unmet need.
const needCategoryPatterns: Record<Exclude<MosqueNeedPreset, 'carpet' | 'custom' | 'all'>, RegExp> = {
  air: /(?:تكييف|تهويه|مكيف|تبريد|مراوح)/,
  lighting: /(?:اناره|كهرباء|اضاءه|مصابيح|لمبات|اسلاك)/,
  cleaning: /(?:نظافه|تنظيف|اتساخ|غسيل|اوساخ|مخلفات)/,
  quran: /(?:مصاحف|مصحف|قران|رفوف المصاحف|حوامل المصاحف)/,
};
const actionOrNeedPattern = /(?:يحتاج|تحتاج|نحتاج|بحاجه|حاجه الي|مطلوب|يتطلب|يلزم|ضروره|نقص|ناقص|غير متوفر|غير صالح|لا يوجد|لا يعمل|لا تعمل|معطل|عطل|خلل|تالف|متهالك|ضعيف|انقطاع|توفير|تامين|شراء|توريد|تغيير|استبدال|صيانه|اصلاح|تجديد|تركيب|تزويد|سحب|ازاله|معالجه)/;
const completedActionPattern = /(?:تم|تمت|جرى|انتهى من)\s+(?:توفير|تامين|شراء|توريد|تغيير|استبدال|صيانه|اصلاح|تجديد|تركيب|تزويد|سحب|ازاله|تنظيف|غسيل|معالجه)/;

const matchesPreset = (item: MosqueFieldVisitItem, preset: MosqueNeedPreset, query: string): boolean => {
  const descriptor = normalize([item.category, item.title, item.note, item.resolutionNote].join(' '));
  if (preset === 'carpet') return isExplicitCarpetNeed([item.note, item.resolutionNote].join(' '))
    || (isExplicitCarpetNeed(item.title) && item.status === 'needs_action');
  if (preset === 'custom') return Boolean(normalize(query)) && descriptor.includes(normalize(query));
  if (preset === 'all') return true;
  return needCategoryPatterns[preset].test(descriptor);
};

// General visit recommendations are not checklist findings. Include a recommendation
// only when it explicitly describes an outstanding need in the chosen category.
const matchesVisitRecommendation = (note: unknown, preset: MosqueNeedPreset, query: string): boolean => {
  const text = normalize(note);
  if (!text || completedActionPattern.test(text) || !actionOrNeedPattern.test(text)) return false;
  if (preset === 'carpet') return isExplicitCarpetNeed(text);
  if (preset === 'custom') return Boolean(normalize(query)) && text.includes(normalize(query));
  if (preset === 'all') return true;
  return needCategoryPatterns[preset].test(text);
};

const visitDateMillis = (visit: MosqueFieldVisit) => {
  const time = new Date(visit.visitDate).getTime();
  return Number.isFinite(time) ? time : 0;
};

export const buildMosqueNeedSummaries = (
  visits: MosqueFieldVisit[],
  options: {
    preset: MosqueNeedPreset;
    query: string;
    state: MosqueNeedStatus;
    siteType: string;
    sort: MosqueNeedSort;
  },
): MosqueNeedSummary[] => {
  // Newer field assessments replace earlier assessments of the same checklist item
  // within the same site/section. Planned/unverified visits must not wipe out findings.
  const latestItems = new Map<string, { visit: MosqueFieldVisit; item: MosqueFieldVisitItem }>();
  const latestTextBySection = new Map<string, MosqueFieldVisit>();
  const ordered = [...visits]
    .filter((visit) => visit.workflowStatus !== 'planned')
    .filter((visit) => !options.siteType || visit.site.siteType === options.siteType)
    .sort((a, b) => visitDateMillis(a) - visitDateMillis(b) || new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

  for (const visit of ordered) {
    const section = visit.visitScope || 'whole_site';
    latestTextBySection.set(visit.siteId + '|' + section, visit);
    for (const item of visit.items || []) {
      if (item.status === 'not_checked') continue;
      latestItems.set([visit.siteId, section, item.category, item.title].join('|'), { visit, item });
    }
  }

  const evidence: MosqueNeedEvidence[] = [];

  for (const { visit, item } of latestItems.values()) {
    if (!matchesState(item, options.state) || !matchesPreset(item, options.preset, options.query)) continue;
    evidence.push({
      siteId: visit.siteId,
      siteName: visit.site.name,
      siteType: visit.site.siteType,
      visitNumber: visit.visitNumber,
      visitDate: visit.visitDate,
      visitScope: visit.visitScope || 'whole_site',
      itemTitle: item.title,
      category: item.category,
      note: String(item.note || item.resolutionNote || 'احتياج مسجل في بند الفحص'),
      priority: item.priority || 'normal',
      resolutionStatus: item.resolutionStatus || 'new',
      responsibleEntity: String(item.responsibleEntity || '-'),
    });
  }

  // A site may have a documented supply/repair need in the visit's written
  // recommendation instead of a checklist item. Apply this equally to every
  // need category, without confusing a completed action with an open request.
  // Resolved-only reports rely on explicitly resolved checklist records.
  if (options.state !== 'resolved') {
    for (const visit of latestTextBySection.values()) {
      const recordedNotes = [visit.recommendations, visit.generalNotes]
        .filter((value) => matchesVisitRecommendation(value, options.preset, options.query));
      if (!recordedNotes.length) continue;
      const alreadyIncluded = evidence.some((item) =>
        item.siteId === visit.siteId && item.visitScope === (visit.visitScope || 'whole_site')
        && item.visitNumber === visit.visitNumber
        && recordedNotes.some((note) => normalize(item.note).includes(normalize(note)))
      );
      if (alreadyIncluded) continue;
      evidence.push({
        siteId: visit.siteId, siteName: visit.site.name, siteType: visit.site.siteType,
        visitNumber: visit.visitNumber, visitDate: visit.visitDate,
        visitScope: visit.visitScope || 'whole_site',
        itemTitle: options.preset === 'all' ? 'احتياج وارد في ملاحظات الزيارة'
          : mosqueNeedPresets.find((preset) => preset.value === options.preset)?.label || 'احتياج ميداني',
        category: 'توصية ميدانية',
        note: recordedNotes.join('؛ '),
        priority: visit.priority || 'normal',
        resolutionStatus: 'new',
        responsibleEntity: '-',
      });
    }
  }

  const grouped = new Map<string, MosqueNeedSummary>();
  for (const finding of evidence) {
    const existing = grouped.get(finding.siteId);
    if (!existing) {
      grouped.set(finding.siteId, {
        siteId: finding.siteId, siteName: finding.siteName, siteType: finding.siteType,
        latestVisit: finding.visitNumber, latestDate: finding.visitDate,
        priority: finding.priority, evidence: [finding],
      });
    } else {
      existing.evidence.push(finding);
      if (new Date(finding.visitDate).getTime() > new Date(existing.latestDate).getTime()) {
        existing.latestVisit = finding.visitNumber;
        existing.latestDate = finding.visitDate;
      }
      if ((priorityRank[finding.priority] || 0) > (priorityRank[existing.priority] || 0)) {
        existing.priority = finding.priority;
      }
    }
  }

  const rows = [...grouped.values()];
  rows.sort((a, b) => {
    if (options.sort === 'priority') return (priorityRank[b.priority] || 0) - (priorityRank[a.priority] || 0)
      || a.siteName.localeCompare(b.siteName, 'ar');
    if (options.sort === 'date') return new Date(b.latestDate).getTime() - new Date(a.latestDate).getTime();
    return a.siteName.localeCompare(b.siteName, 'ar');
  });
  return rows;
};

const escapeHtml = (value: unknown) => String(value ?? '-').replace(/[&<>"']/g, (c) =>
  ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] || c));
const labels: Record<string, string> = {
  mosque: 'مسجد', jami: 'جامع', prayer_room: 'مصلى',
  low: 'منخفضة', normal: 'عادية', medium: 'متوسطة', high: 'مرتفعة', urgent: 'عاجلة',
  new: 'جديدة', referred: 'محالة', in_progress: 'قيد المعالجة', resolved: 'تمت المعالجة', closed: 'مغلقة',
};
const formattedDate = (date: string): string => {
  const d = new Date(date);
  return Number.isNaN(d.getTime()) ? '-' : d.toLocaleDateString('ar-SA-u-ca-gregory');
};

export const createMosqueNeedReportHtml = (
  rows: MosqueNeedSummary[], title: string, criteria: string,
): string => {
  const body = rows.map((row, idx) => {
    const detail = row.evidence.map((item) =>
      '<div class="finding"><b>' + escapeHtml(item.category) + ' — ' + escapeHtml(item.itemTitle) + '</b>: ' + escapeHtml(item.note) +
      '<small>النطاق: ' + escapeHtml(item.visitScope === 'women_section' ? 'مصلى النساء' : item.visitScope === 'men_section' ? 'قسم الرجال' : 'الموقع بالكامل') +
      ' — حالة المعالجة: ' + escapeHtml(labels[item.resolutionStatus] || item.resolutionStatus) + '</small></div>'
    ).join('');
    return '<tr><td>' + (idx + 1) + '</td><td class="name">' + escapeHtml(row.siteName) +
      '</td><td>' + escapeHtml(labels[row.siteType] || row.siteType) +
      '</td><td>' + detail + '</td><td>' + row.evidence.length +
      '</td><td>' + escapeHtml(labels[row.priority] || row.priority) +
      '</td><td>' + escapeHtml(row.latestVisit) +
      '</td><td>' + escapeHtml(formattedDate(row.latestDate)) + '</td></tr>';
  }).join('');
  const total = rows.reduce((sum, row) => sum + row.evidence.length, 0);
  const urgent = rows.filter((row) => row.priority === 'urgent').length;
  return '<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><title>' +
    escapeHtml(title) + '</title><style>' +
    '@page{size:A4 landscape;margin:11mm}*{box-sizing:border-box;print-color-adjust:exact;-webkit-print-color-adjust:exact}' +
    'body{font-family:Tahoma,Arial,sans-serif;direction:rtl;color:#1c3444;margin:16px;background:white;font-size:12px;line-height:1.65}' +
    '.toolbar{padding:10px;background:#f1f5f9;margin-bottom:12px;display:flex;justify-content:space-between;gap:10px;align-items:center}' +
    'button{padding:9px 14px;border-radius:7px;border:0;background:#0b5749;color:white;cursor:pointer}' +
    '.head{border-right:5px solid #0b5749;padding:10px 14px;background:#f1f8f5;margin-bottom:12px}' +
    '.head strong{color:#0b5749;font-size:15px}.head h1{font-size:20px;margin:5px 0}.head p{margin:4px 0;color:#526474}' +
    '.stats{display:flex;gap:10px;margin:10px 0}.stat{flex:1;border:1px solid #cbd5e1;padding:9px;text-align:center}.stat b{display:block;font-size:20px;color:#0b5749}' +
    'table{width:100%;border-collapse:collapse}thead{display:table-header-group}tr{break-inside:avoid}' +
    'td,th{border:1px solid #cad6d5;text-align:right;vertical-align:top;padding:7px;overflow-wrap:anywhere}' +
    'th{background:#0b5749;color:white;font-size:11px}.name{font-weight:bold}.finding+.finding{margin-top:6px;border-top:1px dashed #cbd5e1;padding-top:5px}' +
    '.finding small{display:block;color:#64748b}.footer{margin-top:12px;font-size:10px;color:#64748b}' +
    '@media print{body{margin:0}.toolbar{display:none}}' +
    '</style></head><body><div class="toolbar"><b>معاينة تقرير الاحتياجات — راجع النتائج قبل الطباعة</b><button onclick="window.print()">طباعة / حفظ PDF</button></div>' +
    '<header class="head"><strong>جامعة الإمام عبدالرحمن بن فيصل — وحدة العناية بالمساجد والمصليات</strong><h1>' +
    escapeHtml(title) + '</h1><p>معايير التقرير: ' + escapeHtml(criteria) + '</p><p>تاريخ الإعداد: ' +
    escapeHtml(new Date().toLocaleDateString('ar-SA-u-ca-gregory')) + '</p></header>' +
    '<section class="stats"><div class="stat">المواقع المطابقة<b>' + rows.length +
    '</b></div><div class="stat">الاحتياجات المرصودة<b>' + total +
    '</b></div><div class="stat">مواقع بأولوية عاجلة<b>' + urgent + '</b></div></section>' +
    '<table><thead><tr><th>م</th><th>المسجد / المصلى</th><th>النوع</th><th>الاحتياج والملاحظة</th><th>عدد البنود</th><th>الأولوية</th><th>رقم أحدث زيارة</th><th>تاريخ الزيارة</th></tr></thead>' +
    '<tbody>' + (body || '<tr><td colspan="8">لا توجد مواقع مطابقة للمعايير المحددة.</td></tr>') +
    '</tbody></table><p class="footer">يعتمد التقرير على الملاحظات والاحتياجات المدونة في الزيارات، وليس على مجرد وجود بند فحص ضمن النموذج. يتطلب التحقق الميداني قبل اعتماد الاحتياجات للشراء أو التنفيذ.</p></body></html>';
};

export const openMosqueNeedReport = (rows: MosqueNeedSummary[], title: string, criteria: string): boolean => {
  const report = window.open('', '_blank', 'width=1250,height=850');
  if (!report) return false;
  report.document.open();
  report.document.write(createMosqueNeedReportHtml(rows, title, criteria));
  report.document.close();
  return true;
};
