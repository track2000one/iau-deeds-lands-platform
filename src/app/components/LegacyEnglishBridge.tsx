import React from 'react';
import i18n from '../../i18n/config';

const EXACT: Record<string, string> = {
  'إضافة': 'Add',
  'تعديل': 'Edit',
  'حذف': 'Delete',
  'عرض': 'View',
  'طباعة': 'Print',
  'حفظ': 'Save',
  'إلغاء': 'Cancel',
  'إغلاق': 'Close',
  'بحث': 'Search',
  'بحث متقدم': 'Advanced Search',
  'البحث والاستعلام': 'Search & Inquiry',
  'التقارير': 'Reports',
  'الأرشفة': 'Archive',
  'لوحة التحكم': 'Admin Dashboard',
  'سجل العمليات': 'Audit Log',
  'المظهر': 'Appearance',
  'الرئيسية': 'Home',
  'إضافة صك': 'Add Deed',
  'جميع الصكوك': 'All Deeds',
  'الصكوك': 'Deeds',
  'الأراضي المخصصة': 'Allocated Lands',
  'الأراضي المستلمة': 'Delivered Lands',
  'الأراضي المؤجرة': 'Leased Lands',
  'الأراضي المستأجرة': 'Rented Lands',
  'المباني المؤجرة': 'Leased Buildings',
  'المباني المستأجرة': 'Rented Buildings',
  'معاينة أرض أو موقع': 'Land or Site Inspection',
  'المعاينات الميدانية': 'Field Inspections',
  'متابعة العقود': 'Contract Follow-up',
  'وحدة الأصول': 'Assets Unit',
  'إدارة الأصول': 'Assets Management',
  'إضافة أصل': 'Add Asset',
  'جميع الأصول': 'All Assets',
  'تقارير الأصول': 'Asset Reports',
  'رقم الأصل': 'Asset Number',
  'الباركود': 'Barcode',
  'اسم الأصل': 'Asset Name',
  'التصنيف': 'Category',
  'الماركة': 'Brand',
  'الموديل': 'Model',
  'الرقم التسلسلي': 'Serial Number',
  'الحالة': 'Status',
  'الجهة': 'Department',
  'المبنى': 'Building',
  'الدور': 'Floor',
  'الغرفة': 'Room',
  'صاحب العهدة': 'Custodian',
  'تاريخ الشراء': 'Purchase Date',
  'قيمة الشراء': 'Purchase Value',
  'الملاحظات': 'Notes',
  'المرفقات': 'Attachments',
  'عدد المرفقات': 'Attachment Count',
  'أجهزة ومعدات': 'Equipment & Devices',
  'أثاث': 'Furniture',
  'مركبات': 'Vehicles',
  'أخرى': 'Other',
  'جيدة': 'Good',
  'بحاجة لصيانة': 'Needs Maintenance',
  'تحت الصيانة': 'Under Maintenance',
  'مستبعدة': 'Disposed',
  'مستبعد': 'Excluded',
  'نشط': 'Active',
  'معطل': 'Disabled',
  'مسؤول': 'Administrator',
  'مستخدم عادي - عرض وطباعة فقط': 'Standard User - View and Print Only',
  'مستخدم المنصة': 'Platform User',
  'اسم المستخدم': 'Username',
  'البريد الإلكتروني': 'Email',
  'كلمة المرور': 'Password',
  'الدور': 'Role',
  'حالة الحساب': 'Account Status',
  'المستخدمون المسجلون': 'Registered Users',
  'إضافة مستخدم جديد': 'Add New User',
  'صلاحيات المستخدم التفصيلية': 'Detailed User Permissions',
  'القسم': 'Section',
  'عرض': 'View',
  'إضافة': 'Add',
  'تعديل': 'Edit',
  'حذف': 'Delete',
  'طباعة': 'Print',
  'نوع التاريخ': 'Calendar',
  'ميلادي': 'Gregorian',
  'هجري': 'Hijri',
  '(اختياري)': '(Optional)',
  'تاريخ بداية العقد': 'Contract Start Date',
  'تاريخ نهاية العقد': 'Contract End Date',
  'تاريخ الاستلام': 'Receipt Date',
  'تاريخ الصك': 'Deed Date',
  'رقم الصك': 'Deed Number',
  'بيان العقار': 'Property Description',
  'رقم القطعة': 'Plot Number',
  'رقم المخطط': 'Plan Number',
  'المساحة': 'Area',
  'المدينة': 'City',
  'الحي': 'District',
  'المنطقة': 'Region',
  'الموقع': 'Location',
  'الإحداثيات': 'Coordinates',
  'خط العرض': 'Latitude',
  'خط الطول': 'Longitude',
  'نوع الاستخدام': 'Use Type',
  'الأرض مخططة؟': 'Is the land planned?',
  'الأرض مخططة': 'Planned Land',
  'مخططة': 'Planned',
  'غير مخططة': 'Unplanned',
  'نعم': 'Yes',
  'لا': 'No',
  'سكني': 'Residential',
  'تعليمي': 'Educational',
  'إداري': 'Administrative',
  'حكومي': 'Government',
  'تجاري': 'Commercial',
  'الدمام': 'Dammam',
  'الخبر': 'Khobar',
  'الظهران': 'Dhahran',
  'القطيف': 'Qatif',
  'الجبيل': 'Jubail',
  'الرياض': 'Riyadh',
  'المنطقة الشرقية': 'Eastern Province',
  'فتح الملف': 'Open File',
  'معاينة الملف': 'File Preview',
  'لا توجد مرفقات.': 'No attachments.',
  'رفع ملفات من الجهاز': 'Upload Files from Device',
  'التقاط صورة بالكاميرا': 'Take Photo with Camera',
  'أو إضافة رابط': 'Or Add a Link',
  'اسم المرفق': 'Attachment Name',
  'إضافة الرابط': 'Add Link',
  'جميع الملفات': 'All Files',
  'الصور': 'Images',
  'الموقع على الخريطة': 'Location on Map',
  'الموقع المحدد': 'Selected Location',
  'الخريطة — اختر النقطة': 'Map — Select Location',
  'اضغط على الخريطة لتعبئة الإحداثيات تلقائيًا.': 'Click the map to fill the coordinates automatically.',
  'استخدام موقعي الحالي': 'Use My Current Location',
  'فتح في Google Maps': 'Open in Google Maps',
  'جاري التحميل...': 'Loading...',
  'ليس لديك صلاحية': 'No Permission',
  'العودة إلى الصفحة الرئيسية': 'Back to Home',
  'إجمالي السجلات': 'Total Records',
  'إجمالي المساحة': 'Total Area',
  'إجمالي مساحة الصكوك': 'Total Deed Area',
  'إجمالي الأصول': 'Total Assets',
  'إجمالي قيمة الشراء': 'Total Purchase Value',
  'إجمالي الأراضي': 'Total Lands',
  'إجمالي المباني': 'Total Buildings',
  'إجراء سريع': 'Quick Action',
  'إجراءات سريعة': 'Quick Actions',
  'معلومات النظام': 'System Information',
  'إصدار المنصة': 'Platform Version',
  'وقت التشغيل': 'Uptime',
  'حالة النظام': 'System Status',
  'يعمل بكفاءة': 'Operational',
  'الأمان والموثوقية': 'Security & Reliability',
  'مستوى الأمان': 'Security Level',
  'التنبيهات والإشعارات': 'Alerts & Notifications',
  'تحديث جديد': 'New Update',
  'معاملة بحاجة لمراجعة': 'Record Requires Review',
  'رفع مخطط': 'Upload Plan',
  'آخر الصكوك المضافة للنظام': 'Latest deeds added to the system',
  'لا توجد صكوك': 'No deeds found',
  'إنشاء معاملة جديدة': 'Create New Record',
  'إصدار صك جديد': 'Create New Deed',
  'تسجيل أرض': 'Register Land',
  'رفع مستند': 'Upload Document',
  'إضافة أرض جديدة': 'Add New Land',
  'البحث في السجلات': 'Search records',
  'إحصاءات وطباعة': 'Statistics & Printing',
  'حفظ الملفات والأرشفة': 'Save files and archive',
  'الإجراءات': 'Actions',
  'بحث وتصفية': 'Search & Filter',
  'البحث والتصفية': 'Search & Filter',
  'كلمة البحث': 'Search Term',
  'نتائج البحث': 'Search Results',
  'لا توجد نتائج': 'No Results',
  'تحديد الكل': 'Select All',
  'اختيار الأعمدة': 'Select Columns',
  'ترتيب الصف': 'Row Order',
  'ترتيب / استبعاد': 'Order / Exclude',
  'إلغاء الترتيب اليدوي': 'Disable Manual Ordering',
  'ترتيب يدوي مخصص': 'Custom Manual Ordering',
  'استعادة المستبعد': 'Restore Excluded',
  'معاينة وطباعة': 'Preview & Print',
  'التوقيع': 'Signature',
  'الختم': 'Stamp',
  'التاريخ': 'Date',
  'الوقت': 'Time',
  'تاريخ التقرير': 'Report Date',
  'تقرير الصكوك': 'Deeds Report',
  'تقرير الأصول': 'Assets Report',
  'تقرير معاينة أرض أو موقع': 'Land or Site Inspection Report',
  'الحالة العامة': 'General Status',
  'سبب الزيارة': 'Visit Reason',
  'وصف الموقع': 'Site Description',
  'الملاحظات المرصودة': 'Observed Notes',
  'الإجراء المقترح والتوصيات': 'Proposed Action & Recommendations',
  'عناصر المعاينة التفصيلية': 'Detailed Inspection Items',
  'التوثيق المصور والمرفقات': 'Photo Documentation & Attachments',
  'الأولوية': 'Priority',
  'حالة المعالجة': 'Resolution Status',
  'عاجل': 'Urgent',
  'حرج': 'Critical',
  'منتهي': 'Expired',
  'ساري': 'Active',
  'بيانات ناقصة': 'Missing Data',
  'لم تبدأ المتابعة': 'Not Started',
  'تحت الإجراء': 'In Progress',
  'تم التجديد': 'Renewed',
  'عدم التجديد': 'Do Not Renew',
  'مغلق': 'Closed',
  'المسؤول عن المتابعة': 'Follow-up Owner',
  'الإجراء المطلوب': 'Required Action',
  'موعد المتابعة القادم': 'Next Follow-up Date',
  'ملاحظات المتابعة': 'Follow-up Notes',
  'حفظ المتابعة': 'Save Follow-up',
  'تسجيل الدخول': 'Sign In',
  'جاري تسجيل الدخول...': 'Signing in...',
  'نسيت كلمة المرور؟': 'Forgot password?',
  'تفعيل الحساب': 'Activate Account',
  'تغيير كلمة مرور جديدة': 'Set a New Password',
  'كلمة المرور الجديدة': 'New Password',
  'تأكيد كلمة المرور الجديدة': 'Confirm New Password',
  'الاحتفاظ بكلمة المرور': 'Keep Current Password',
  'تفعيل الحساب والاحتفاظ بكلمة المرور': 'Activate Account and Keep Password',
  'تفعيل الحساب وتحديث كلمة المرور': 'Activate Account and Update Password',
};

const PATTERNS: Array<[RegExp, (...parts: string[]) => string]> = [
  [/^المرفقات \((\d+)\)$/u, (count) => `Attachments (${count})`],
  [/^تم العثور على (\d+) نتيجة$/u, (count) => `${count} results found`],
  [/^إجمالي (\d+) سجل$/u, (count) => `Total: ${count} records`],
  [/^حتى (\d+) ملفات، بحد (\d+) ميجابايت للملف$/u, (max, size) => `Up to ${max} files, ${size} MB per file`],
  [/^جاري رفع (\d+) ملف\.\.\.$/u, (count) => `Uploading ${count} file(s)...`],
];

const toLatinDigits = (value: string) => value
  .replace(/[٠-٩]/g, (digit) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(digit)))
  .replace(/[۰-۹]/g, (digit) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(digit)));

const translateText = (input: string) => {
  const latin = toLatinDigits(input);
  const trimmed = latin.trim();
  if (!trimmed) return input;

  const exact = EXACT[trimmed];
  if (exact) {
    return latin.replace(trimmed, exact);
  }

  for (const [pattern, formatter] of PATTERNS) {
    const match = trimmed.match(pattern);
    if (match) {
      return latin.replace(trimmed, formatter(...match.slice(1)));
    }
  }

  return latin;
};

const ATTRIBUTES = ['placeholder', 'title', 'aria-label'] as const;

const translateElement = (root: ParentNode) => {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  let node: Node | null;
  while ((node = walker.nextNode())) {
    const textNode = node as Text;
    const parent = textNode.parentElement;
    if (!parent || ['SCRIPT', 'STYLE'].includes(parent.tagName)) continue;
    const next = translateText(textNode.data);
    if (next !== textNode.data) textNode.data = next;
  }

  const elements = root instanceof Element ? [root, ...Array.from(root.querySelectorAll('*'))] : Array.from(root.querySelectorAll('*'));
  for (const element of elements) {
    for (const attr of ATTRIBUTES) {
      const current = element.getAttribute(attr);
      if (!current) continue;
      const next = translateText(current);
      if (next !== current) element.setAttribute(attr, next);
    }
  }
};

export const LegacyEnglishBridge: React.FC = () => {
  React.useEffect(() => {
    const apply = () => {
      if (i18n.language !== 'en') return;
      document.documentElement.lang = 'en';
      document.documentElement.dir = 'ltr';
      translateElement(document.body);
    };

    const observer = new MutationObserver((mutations) => {
      if (i18n.language !== 'en') return;
      for (const mutation of mutations) {
        if (mutation.type === 'characterData' && mutation.target.parentNode) {
          const textNode = mutation.target as Text;
          const next = translateText(textNode.data);
          if (next !== textNode.data) textNode.data = next;
        }
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === Node.TEXT_NODE) {
            const textNode = node as Text;
            const next = translateText(textNode.data);
            if (next !== textNode.data) textNode.data = next;
          } else if (node instanceof Element) {
            translateElement(node);
          }
        });
      }
    });

    apply();
    observer.observe(document.body, { childList: true, subtree: true, characterData: true });
    const handleLanguageChanged = () => {
      window.requestAnimationFrame(() => {
        if (i18n.language === 'en') apply();
      });
    };
    i18n.on('languageChanged', handleLanguageChanged);

    return () => {
      observer.disconnect();
      i18n.off('languageChanged', handleLanguageChanged);
    };
  }, []);

  return null;
};
