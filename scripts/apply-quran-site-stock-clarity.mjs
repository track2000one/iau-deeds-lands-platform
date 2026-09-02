import fs from 'node:fs';

const path = 'src/app/components/MosqueFieldVisitsPanel.tsx';
let source = fs.readFileSync(path, 'utf8');

const replaceOnce = (from, to, label) => {
  if (!source.includes(from)) throw new Error(`Missing anchor: ${label}`);
  source = source.replace(from, to);
};

replaceOnce(
  'return `الجرد الميداني: إجمالي ${total} — كبير ${Number(details.largeCount || 0)} — متوسط ${Number(details.mediumCount || 0)} — صغير ${Number(details.smallCount || 0)} — المقترح سحبها/استبدالها ${Number(details.recommendedWithdrawalCount || 0)} — الحالة ${condition} — جهة الطباعة ${publisher}`;',
  'return `الجرد الميداني للموقع: إجمالي ${total} — كبير ${Number(details.largeCount || 0)} — متوسط ${Number(details.mediumCount || 0)} — صغير ${Number(details.smallCount || 0)} — المقترح سحبها/استبدالها ${Number(details.recommendedWithdrawalCount || 0)} — الحالة ${condition} — جهة الطباعة ${publisher}`;',
  'Quran inventory summary label',
);

replaceOnce(
  '<b className="text-sm text-emerald-950">الجرد الميداني للمصاحف</b><p className="mt-1 text-[11px] leading-5 text-slate-600">أدخل العدد الفعلي الموجود أثناء الزيارة. عند الحفظ ينتقل الجرد تلقائيًا إلى قائمة المصاحف؛ قبل إقفال الجرد التأسيسي يُسجل كتحديث تأسيسي، وبعد الإقفال يُحفظ كجرد دوري جديد.</p>',
  '<b className="text-sm text-emerald-950">الجرد الميداني لرصيد المسجد / المصلى</b><p className="mt-1 text-[11px] leading-5 text-slate-600">أدخل العدد الفعلي الموجود داخل المسجد أو المصلى أثناء الزيارة. هذه الأعداد تخص رصيد الموقع فقط ولا تُضاف إلى مخزون مكتبة المصاحف. قبل إقفال الجرد التأسيسي تُسجل كتحديث تأسيسي للموقع، وبعد الإقفال تُحفظ كجرد دوري جديد.</p>',
  'Quran field census explanation',
);

replaceOnce(
  'الرصيد النظامي الحالي: <b>{stock?.systemStock.totalCount ?? 0}</b>',
  'رصيد الموقع النظامي الحالي: <b>{stock?.systemStock.totalCount ?? 0}</b>',
  'site system stock label',
);

replaceOnce(
  'جارٍ تحميل بيانات مكتبة المصاحف المرتبطة بالموقع...',
  'جارٍ تحميل رصيد المصاحف المسجل للمسجد أو المصلى...',
  'Quran stock loading label',
);

replaceOnce(
  '<b className="text-sm text-emerald-950">مرجع مكتبة المصاحف المرتبط بالموقع</b>',
  '<b className="text-sm text-emerald-950">رصيد المصاحف بالمسجد / المصلى</b>',
  'Quran stock link title',
);

replaceOnce(
  '<p className="mt-1 text-[11px] text-slate-500">تُعرض بيانات الرصيد النظامي مباشرة داخل الزيارة لتجنب إعادة إدخال الأعداد يدويًا.</p>',
  '<p className="mt-1 text-[11px] text-slate-500">هذا هو رصيد الموقع نفسه وليس مخزون المكتبة المركزية. الجرد الميداني يحدّث رصيد المسجد أو المصلى فقط، بينما تتغير مكتبة المصاحف بالحركات المخزنية الرسمية مثل الاستلام والتوزيع والإرجاع.</p>',
  'Quran stock link explanation',
);

replaceOnce(
  'نسخ الرصيد النظامي كبداية للجرد',
  'نسخ رصيد الموقع كبداية للجرد',
  'copy site stock button',
);

replaceOnce(
  'المتاح في مكتبة المصاحف: <b>{dashboard.summary.warehouseTotal.toLocaleString(\'ar-SA\')}</b>',
  'المخزون المركزي المتاح للتزويد: <b>{dashboard.summary.warehouseTotal.toLocaleString(\'ar-SA\')}</b>',
  'central warehouse label',
);

replaceOnce(
  "toast.success('تم نسخ الرصيد النظامي الحالي كنقطة بداية؛ عدّل الأعداد لتطابق العد الفعلي في الموقع');",
  "toast.success('تم نسخ رصيد الموقع النظامي كنقطة بداية؛ عدّل الأعداد لتطابق العد الفعلي داخل المسجد أو المصلى');",
  'copy stock toast',
);

replaceOnce(
  "      details.notes ? 'ملاحظات: ' + details.notes : '',\n    ].filter(Boolean).join('\\n');",
  "      'نوع الرصيد: رصيد المسجد / المصلى فقط — لا يمثل إضافة إلى مخزون مكتبة المصاحف.',\n      details.notes ? 'ملاحظات: ' + details.notes : '',\n    ].filter(Boolean).join('\\n');",
  'site-only inventory audit note',
);

replaceOnce(
  "toast.success('تم نقل أعداد المصاحف من الزيارة إلى الجرد التأسيسي للموقع');",
  "toast.success('تم تسجيل أعداد المصاحف في الجرد التأسيسي للمسجد / المصلى دون إضافتها إلى مخزون المكتبة');",
  'baseline sync toast',
);

replaceOnce(
  "toast.success('تم تسجيل أعداد المصاحف من الزيارة كجرد دوري جديد');",
  "toast.success('تم تحديث رصيد المسجد / المصلى من الزيارة كجرد دوري جديد دون تغيير مخزون المكتبة');",
  'periodic census toast',
);

fs.writeFileSync(path, source);
console.log('Applied Quran site-stock separation wording.');
