import React from 'react';
import i18n from '../../i18n/config';

const EXACT: Record<string, string> = {
  'إضافة': 'Add', 'تعديل': 'Edit', 'حذف': 'Delete', 'عرض': 'View', 'طباعة': 'Print',
  'حفظ': 'Save', 'إلغاء': 'Cancel', 'إغلاق': 'Close', 'بحث': 'Search', 'بحث متقدم': 'Advanced Search',
  'الرئيسية': 'Home', 'البحث والاستعلام': 'Search & Inquiry', 'التقارير': 'Reports', 'الأرشفة': 'Archive',
  'لوحة التحكم': 'Admin Dashboard', 'سجل العمليات': 'Audit Log', 'المظهر': 'Appearance',
  'الصكوك': 'Deeds', 'إضافة صك': 'Add Deed', 'جميع الصكوك': 'All Deeds',
  'الأراضي المخصصة': 'Allocated Lands', 'الأراضي المستلمة': 'Delivered Lands',
  'الأراضي المؤجرة': 'Leased Lands', 'الأراضي المستأجرة': 'Rented Lands',
  'المباني المؤجرة': 'Leased Buildings', 'المباني المستأجرة': 'Rented Buildings',
  'معاينة أرض أو موقع': 'Land or Site Inspection', 'المعاينات الميدانية': 'Field Inspections',
  'متابعة العقود': 'Contract Follow-up', 'وحدة الأصول': 'Assets Unit', 'إدارة الأصول': 'Assets Management',

  'بحث وتصفية': 'Search & Filter', 'البحث والتصفية': 'Search & Filter', 'كلمة البحث': 'Search Term',
  'نتائج البحث': 'Search Results', 'لا توجد نتائج': 'No Results', 'الإجراءات': 'Actions',
  'تحديد الكل': 'Select All', 'إلغاء تحديد الكل': 'Deselect All', 'اختيار الأعمدة': 'Select Columns',
  'ترتيب الصف': 'Row Order', 'ترتيب / استبعاد': 'Order / Exclude', 'اتجاه الترتيب': 'Sort Direction',
  'الترتيب': 'Sort By', 'تصاعدي': 'Ascending', 'تنازلي': 'Descending',
  'بدون ترتيب إضافي': 'No Additional Sorting', 'إلغاء الترتيب اليدوي': 'Disable Manual Ordering',
  'ترتيب يدوي مخصص': 'Custom Manual Ordering', 'استعادة المستبعد': 'Restore Excluded',
  'معاينة وطباعة': 'Preview & Print', 'Excel': 'Excel', 'PDF': 'PDF',

  'إجمالي السجلات': 'Total Records', 'إجمالي المساحة': 'Total Area', 'إجمالي مساحة الصكوك': 'Total Deed Area',
  'إجمالي الأراضي': 'Total Lands', 'إجمالي المباني': 'Total Buildings', 'إجمالي الأصول': 'Total Assets',
  'إجمالي قيمة الشراء': 'Total Purchase Value', 'إجمالي القيم الإيجارية': 'Total Rental Value',
  'إجمالي الإيجار': 'Total Rent', 'إجمالي المعاينات الميدانية': 'Total Field Inspections',

  'وصف العقار': 'Property Description', 'بيان العقار': 'Property Description', 'رقم الصك': 'Deed Number',
  'تاريخ الصك': 'Deed Date', 'رقم القطعة': 'Plot Number', 'رقم المخطط': 'Plan Number', 'المساحة': 'Area',
  'المنطقة': 'Region', 'المدينة': 'City', 'الحي': 'District', 'نوع الاستخدام': 'Use Type',
  'مخططة': 'Planned', 'غير مخططة': 'Unplanned', 'الأرض مخططة': 'Planned Land', 'الأرض مخططة؟': 'Is the land planned?',
  'الإحداثيات': 'Coordinates', 'خط العرض': 'Latitude', 'خط الطول': 'Longitude', 'الموقع': 'Location',
  'الملاحظات': 'Notes', 'المرفقات': 'Attachments', 'عدد المرفقات': 'Attachment Count',

  'رقم محضر الاستلام': 'Receipt Record Number', 'تاريخ الاستلام': 'Receipt Date', 'الجهة المستلمة': 'Receiving Entity',
  'الجهة المسلمة': 'Delivering Entity', 'الحالة': 'Status', 'مستلمة رسميًا': 'Officially Received',
  'رقم الصك المرتبط': 'Linked Deed Number', 'وصف الأرض': 'Land Description',
  'الأرض المستلمة': 'Delivered Land', 'تفاصيل الأرض المستلمة': 'Delivered Land Details',
  'قائمة الأراضي المستلمة': 'Delivered Lands List', 'قائمة الأراضي المخصصة': 'Allocated Lands List',
  'تفاصيل الأرض المخصصة': 'Allocated Land Details', 'الأرض المخصصة': 'Allocated Land',
  'مستند التخصيص': 'Allocation Document', 'رقم قرار التخصيص': 'Allocation Decision Number',
  'تاريخ قرار التخصيص': 'Allocation Decision Date', 'الجهة المخصصة': 'Allocating Entity',

  'رقم العقد': 'Contract Number', 'اسم المستأجر': 'Tenant Name', 'المستأجر': 'Tenant', 'المالك': 'Owner',
  'تاريخ بداية العقد': 'Contract Start Date', 'تاريخ نهاية العقد': 'Contract End Date', 'مدة العقد': 'Contract Duration',
  'قيمة الإيجار': 'Rent Amount', 'القيمة الإيجارية': 'Rental Value', 'حالة العقد': 'Contract Status',
  'بيانات العقد': 'Contract Information', 'بيانات الموقع': 'Location Information', 'تفاصيل العقد': 'Contract Details',
  'ساري': 'Active', 'منتهي': 'Expired', 'عاجل': 'Urgent', 'حرج': 'Critical', 'بيانات ناقصة': 'Missing Data',
  'لم تبدأ المتابعة': 'Not Started', 'تحت الإجراء': 'In Progress', 'تم التجديد': 'Renewed',
  'عدم التجديد': 'Do Not Renew', 'مغلق': 'Closed', 'المسؤول عن المتابعة': 'Follow-up Owner',
  'الإجراء المطلوب': 'Required Action', 'موعد المتابعة القادم': 'Next Follow-up Date',
  'ملاحظات المتابعة': 'Follow-up Notes', 'حفظ المتابعة': 'Save Follow-up',

  'رقم المعاينة': 'Inspection Number', 'عنوان المعاينة': 'Inspection Title', 'اسم الموقع': 'Site Name',
  'نوع الموقع': 'Site Type', 'تاريخ الزيارة': 'Visit Date', 'الحالة العامة': 'General Status',
  'سير المعالجة': 'Workflow Status', 'سبب الزيارة': 'Visit Reason', 'وصف الموقع': 'Site Description',
  'الملاحظات المرصودة': 'Observed Notes', 'الإجراء المقترح والتوصيات': 'Proposed Action & Recommendations',
  'عناصر المعاينة التفصيلية': 'Detailed Inspection Items', 'التوثيق المصور والمرفقات': 'Photo Documentation & Attachments',
  'الأولوية': 'Priority', 'حالة المعالجة': 'Resolution Status', 'جديدة': 'New', 'قيد المراجعة': 'Under Review',
  'تمت الإحالة': 'Referred', 'جارٍ التنفيذ': 'In Progress', 'تمت المعالجة': 'Resolved', 'مغلقة': 'Closed',
  'ممتازة': 'Excellent', 'جيدة': 'Good', 'تحتاج متابعة': 'Needs Follow-up', 'تحتاج صيانة': 'Needs Maintenance',
  'ملاحظات جوهرية': 'Major Notes', 'حالة طارئة': 'Emergency',

  'نوع التاريخ': 'Calendar', 'ميلادي': 'Gregorian', 'هجري': 'Hijri', '(اختياري)': '(Optional)',
  'نعم': 'Yes', 'لا': 'No', 'الكل': 'All', 'جميع المدن': 'All Cities', 'جميع الاستخدامات': 'All Use Types',
  'جميع الحالات': 'All Statuses', 'جميع السجلات': 'All Records', 'مع إحداثيات': 'With Coordinates',
  'بدون إحداثيات': 'Without Coordinates', 'مع مرفقات': 'With Attachments', 'بدون مرفقات': 'Without Attachments',
  'سكني': 'Residential', 'تعليمي': 'Educational', 'إداري': 'Administrative', 'حكومي': 'Government',
  'تجاري': 'Commercial', 'أخرى': 'Other',
  'المنطقة الشرقية': 'Eastern Province', 'الدمام': 'Dammam', 'الخبر': 'Khobar', 'الظهران': 'Dhahran',
  'القطيف': 'Qatif', 'الجبيل': 'Jubail', 'الرياض': 'Riyadh',

  'إعدادات التقرير': 'Report Settings', 'عنوان التقرير': 'Report Title', 'نص المقدمة': 'Introduction Text',
  'نص التذييل': 'Footer Text', 'إظهار التوقيع': 'Show Signature', 'إظهار الختم': 'Show Stamp',
  'التوقيع': 'Signature', 'الختم': 'Stamp', 'اسم التوقيع': 'Signature Label', 'اسم الختم': 'Stamp Label',
  'نوع الخط': 'Font Family', 'حجم الخط': 'Font Size', 'لون رأس الجدول': 'Table Header Color',
  'لون الخط': 'Font Color', 'تقرير الصكوك': 'Deeds Report', 'تقرير الأصول': 'Assets Report',
  'تقرير معاينة أرض أو موقع': 'Land or Site Inspection Report', 'التاريخ': 'Date', 'الوقت': 'Time',
  'تاريخ التقرير': 'Report Date',

  'رفع ملفات من الجهاز': 'Upload Files from Device', 'التقاط صورة بالكاميرا': 'Take Photo with Camera',
  'أو إضافة رابط': 'Or Add a Link', 'اسم المرفق': 'Attachment Name', 'إضافة الرابط': 'Add Link',
  'جميع الملفات': 'All Files', 'الصور': 'Images', 'فتح الملف': 'Open File', 'معاينة الملف': 'File Preview',
  'لا توجد مرفقات.': 'No attachments.', 'الموقع على الخريطة': 'Location on Map', 'الموقع المحدد': 'Selected Location',
  'الخريطة — اختر النقطة': 'Map — Select Location', 'اضغط على الخريطة لتعبئة الإحداثيات تلقائيًا.': 'Click the map to fill the coordinates automatically.',
  'استخدام موقعي الحالي': 'Use My Current Location', 'فتح في Google Maps': 'Open in Google Maps',

  'رقم الأصل': 'Asset Number', 'الباركود': 'Barcode', 'اسم الأصل': 'Asset Name', 'التصنيف': 'Category',
  'الماركة': 'Brand', 'الموديل': 'Model', 'الرقم التسلسلي': 'Serial Number', 'الجهة': 'Department',
  'المبنى': 'Building', 'الدور': 'Floor', 'الغرفة': 'Room', 'صاحب العهدة': 'Custodian',
  'تاريخ الشراء': 'Purchase Date', 'قيمة الشراء': 'Purchase Value', 'أجهزة ومعدات': 'Equipment & Devices',
  'أثاث': 'Furniture', 'مركبات': 'Vehicles', 'بحاجة لصيانة': 'Needs Maintenance', 'تحت الصيانة': 'Under Maintenance',
  'مستبعدة': 'Disposed',

  'جاري التحميل...': 'Loading...', 'ليس لديك صلاحية': 'No Permission', 'العودة إلى الصفحة الرئيسية': 'Back to Home',
  'نشط': 'Active', 'معطل': 'Disabled', 'مسؤول': 'Administrator', 'مستخدم المنصة': 'Platform User',
  'اسم المستخدم': 'Username', 'البريد الإلكتروني': 'Email', 'كلمة المرور': 'Password', 'الدور': 'Role',
  'حالة الحساب': 'Account Status', 'المستخدمون المسجلون': 'Registered Users',
  'إضافة مستخدم جديد': 'Add New User', 'صلاحيات المستخدم التفصيلية': 'Detailed User Permissions',
};

const PATTERNS: Array<[RegExp, (...parts: string[]) => string]> = [
  [/^المرفقات \((\d+)\)$/u, (count) => `Attachments (${count})`],
  [/^تم العثور على (\d+) نتيجة$/u, (count) => `${count} results found`],
  [/^إجمالي (\d+) سجل$/u, (count) => `Total: ${count} records`],
  [/^إجمالي النتائج \((\d+)\)$/u, (count) => `Total Results (${count})`],
  [/^قائمة الأراضي المخصصة \((\d+)\)$/u, (count) => `Allocated Lands List (${count})`],
  [/^قائمة الأراضي المستلمة \((\d+)\)$/u, (count) => `Delivered Lands List (${count})`],
  [/^حتى (\d+) ملفات، بحد (\d+) ميجابايت للملف$/u, (max, size) => `Up to ${max} files, ${size} MB per file`],
  [/^جاري رفع (\d+) ملف\.\.\.$/u, (count) => `Uploading ${count} file(s)...`],
  [/^استعادة المستبعد \((\d+)\)$/u, (count) => `Restore Excluded (${count})`],
  [/^(\d+) سجل$/u, (count) => `${count} record(s)`],
];

const toLatinDigits = (value: string) => value
  .replace(/[٠-٩]/g, (digit) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(digit)))
  .replace(/[۰-۹]/g, (digit) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(digit)));

const translateText = (input: string) => {
  const latin = toLatinDigits(input);
  const trimmed = latin.trim();
  if (!trimmed) return input;

  const exact = EXACT[trimmed];
  if (exact) return latin.replace(trimmed, exact);

  for (const [pattern, formatter] of PATTERNS) {
    const match = trimmed.match(pattern);
    if (match) return latin.replace(trimmed, formatter(...match.slice(1)));
  }

  return latin;
};

const ATTRIBUTES = ['placeholder', 'title', 'aria-label'] as const;
const originalText = new WeakMap<Text, string>();
const originalAttributes = new WeakMap<Element, Map<string, string>>();

const rememberText = (node: Text) => {
  if (!originalText.has(node)) originalText.set(node, node.data);
};

const rememberAttribute = (element: Element, attr: string, value: string) => {
  let values = originalAttributes.get(element);
  if (!values) {
    values = new Map<string, string>();
    originalAttributes.set(element, values);
  }
  if (!values.has(attr)) values.set(attr, value);
};

const translateElement = (root: ParentNode) => {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  let node: Node | null;
  while ((node = walker.nextNode())) {
    const textNode = node as Text;
    const parent = textNode.parentElement;
    if (!parent || ['SCRIPT', 'STYLE'].includes(parent.tagName)) continue;
    rememberText(textNode);
    const source = originalText.get(textNode) ?? textNode.data;
    const next = translateText(source);
    if (next !== textNode.data) textNode.data = next;
  }

  const elements = root instanceof Element
    ? [root, ...Array.from(root.querySelectorAll('*'))]
    : Array.from(root.querySelectorAll('*'));

  for (const element of elements) {
    for (const attr of ATTRIBUTES) {
      const current = element.getAttribute(attr);
      if (!current) continue;
      rememberAttribute(element, attr, current);
      const source = originalAttributes.get(element)?.get(attr) ?? current;
      const next = translateText(source);
      if (next !== current) element.setAttribute(attr, next);
    }
  }
};

const restoreElement = (root: ParentNode) => {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  let node: Node | null;
  while ((node = walker.nextNode())) {
    const textNode = node as Text;
    const original = originalText.get(textNode);
    if (original !== undefined && textNode.data !== original) textNode.data = original;
  }

  const elements = root instanceof Element
    ? [root, ...Array.from(root.querySelectorAll('*'))]
    : Array.from(root.querySelectorAll('*'));

  for (const element of elements) {
    const values = originalAttributes.get(element);
    if (!values) continue;
    for (const [attr, value] of values) element.setAttribute(attr, value);
  }
};

export const LegacyEnglishBridge: React.FC = () => {
  React.useEffect(() => {
    const syncLanguage = () => {
      const english = i18n.language === 'en';
      document.documentElement.lang = english ? 'en' : 'ar';
      document.documentElement.dir = english ? 'ltr' : 'rtl';
      if (english) translateElement(document.body);
      else restoreElement(document.body);
    };

    const observer = new MutationObserver((mutations) => {
      if (i18n.language !== 'en') return;
      for (const mutation of mutations) {
        if (mutation.type === 'characterData') {
          const textNode = mutation.target as Text;
          if (textNode.parentElement && !['SCRIPT', 'STYLE'].includes(textNode.parentElement.tagName)) {
            if (!originalText.has(textNode)) originalText.set(textNode, textNode.data);
            const source = originalText.get(textNode) ?? textNode.data;
            const next = translateText(source);
            if (next !== textNode.data) textNode.data = next;
          }
        }
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === Node.TEXT_NODE) {
            const textNode = node as Text;
            if (!originalText.has(textNode)) originalText.set(textNode, textNode.data);
            const next = translateText(originalText.get(textNode) ?? textNode.data);
            if (next !== textNode.data) textNode.data = next;
          } else if (node instanceof Element) {
            translateElement(node);
          }
        });
      }
    });

    syncLanguage();
    observer.observe(document.body, { childList: true, subtree: true, characterData: true });

    const handleLanguageChanged = () => window.requestAnimationFrame(syncLanguage);
    i18n.on('languageChanged', handleLanguageChanged);

    return () => {
      observer.disconnect();
      i18n.off('languageChanged', handleLanguageChanged);
    };
  }, []);

  return null;
};
