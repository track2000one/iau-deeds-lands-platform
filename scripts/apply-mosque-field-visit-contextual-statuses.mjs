import fs from 'node:fs';

const filePath = 'src/app/components/MosqueFieldVisitsPanel.tsx';
let source = fs.readFileSync(filePath, 'utf8');

const statusLabelsMarker = `const itemStatusLabels: Record<string, string> = {
  good: 'سليم',
  needs_action: 'يحتاج معالجة',
  not_available: 'غير متوفر',
  not_applicable: 'لا ينطبق',
  not_checked: 'لم يتم التحقق',
};`;

const contextualStatusConfig = `${statusLabelsMarker}

type ItemStatusOption = { value: MosqueFieldVisitItem['status']; label: string };
type ItemStatusProfileKey =
  | 'cleanliness'
  | 'operation'
  | 'condition'
  | 'absence_check'
  | 'required_availability'
  | 'fire_safety'
  | 'quran_compliance'
  | 'quran_quantity'
  | 'activity_approval'
  | 'accessibility'
  | 'readiness';

const uncheckedStatus: ItemStatusOption = { value: 'not_checked', label: 'لم يتم التحقق' };
const notApplicableStatus: ItemStatusOption = { value: 'not_applicable', label: 'لا ينطبق' };

const itemStatusProfiles: Record<ItemStatusProfileKey, ItemStatusOption[]> = {
  cleanliness: [
    { value: 'good', label: 'نظيف ومناسب' },
    { value: 'needs_action', label: 'يحتاج تنظيف أو معالجة' },
    notApplicableStatus,
    uncheckedStatus,
  ],
  operation: [
    { value: 'good', label: 'يعمل بكفاءة' },
    { value: 'needs_action', label: 'متوقف أو يحتاج صيانة' },
    notApplicableStatus,
    uncheckedStatus,
  ],
  condition: [
    { value: 'good', label: 'سليم' },
    { value: 'needs_action', label: 'غير سليم / يحتاج معالجة' },
    notApplicableStatus,
    uncheckedStatus,
  ],
  absence_check: [
    { value: 'good', label: 'لا توجد ملاحظة' },
    { value: 'needs_action', label: 'توجد ملاحظة تحتاج معالجة' },
    notApplicableStatus,
    uncheckedStatus,
  ],
  required_availability: [
    { value: 'good', label: 'متوفر وبحالة مناسبة' },
    { value: 'needs_action', label: 'غير متوفر أو يحتاج استكمال' },
    notApplicableStatus,
    uncheckedStatus,
  ],
  fire_safety: [
    { value: 'good', label: 'متوفرة وصالحة' },
    { value: 'needs_action', label: 'غير متوفرة أو تحتاج صيانة / استبدال' },
    notApplicableStatus,
    uncheckedStatus,
  ],
  quran_compliance: [
    { value: 'good', label: 'سليمة ومعتمدة' },
    { value: 'needs_action', label: 'تحتاج معالجة أو استبدال' },
    notApplicableStatus,
    uncheckedStatus,
  ],
  quran_quantity: [
    { value: 'good', label: 'كافية ومناسبة' },
    { value: 'needs_action', label: 'غير كافية / تحتاج استكمال' },
    notApplicableStatus,
    uncheckedStatus,
  ],
  activity_approval: [
    { value: 'good', label: 'معتمدة' },
    { value: 'needs_action', label: 'غير معتمدة / تحتاج استكمال' },
    { value: 'not_available', label: 'لا توجد أنشطة قائمة' },
    notApplicableStatus,
    uncheckedStatus,
  ],
  accessibility: [
    { value: 'good', label: 'ملائم ومهيأ' },
    { value: 'needs_action', label: 'غير مهيأ / يحتاج تحسين' },
    uncheckedStatus,
  ],
  readiness: [
    { value: 'good', label: 'منظم وجاهز' },
    { value: 'needs_action', label: 'غير جاهز / يحتاج معالجة' },
    uncheckedStatus,
  ],
};

const itemStatusProfileByTitle: Record<string, ItemStatusProfileKey> = {
  'نظافة السجاد والأرضيات': 'cleanliness',
  'نظافة الجدران والنوافذ وخلو الموقع من الروائح': 'cleanliness',
  'نظافة مرافق الوضوء ودورات المياه': 'cleanliness',
  'كفاءة التكييف والتهوية وعدم وجود تسربات': 'operation',
  'سلامة الإنارة والمفاتيح والمقابس': 'condition',
  'عدم وجود تمديدات كهربائية مكشوفة أو غير آمنة': 'absence_check',
  'سلامة الميكروفونات والسماعات وأجهزة الأذان': 'operation',
  'وضوح مخارج الطوارئ وخلوها من العوائق': 'condition',
  'توفر طفايات الحريق وصلاحيتها': 'fire_safety',
  'سلامة الأبواب والممرات وسهولة الحركة': 'condition',
  'توفر دواليب ورفوف المصاحف بحالة مناسبة': 'required_availability',
  'سلامة الفواصل والستائر والساعات واللوحات': 'required_availability',
  'سلامة المصاحف والتحقق من جهة الطباعة': 'quran_compliance',
  'كفاية أعداد المصاحف وملاءمة أحجامها': 'quran_quantity',
  'خلو الموقع من الكتب والنشرات غير المعتمدة': 'absence_check',
  'اعتماد حلقات التحفيظ والمحاضرات والأنشطة القائمة': 'activity_approval',
  'ملاءمة الموقع لكبار السن والأشخاص ذوي الإعاقة': 'accessibility',
  'تنظيم الموقع ووضوح اتجاه القبلة وجاهزيته للصلاة': 'readiness',
};

const getItemStatusOptions = (item: MosqueFieldVisitItem): ItemStatusOption[] => {
  const profile = itemStatusProfileByTitle[item.title] || 'condition';
  const options = itemStatusProfiles[profile];
  if (options.some((option) => option.value === item.status)) return options;

  // Keep historical values editable even when a newer contextual profile no longer offers that value.
  return [
    { value: item.status, label: itemStatusLabels[item.status] || item.status },
    ...options,
  ];
};

const getItemStatusLabel = (item: MosqueFieldVisitItem) =>
  getItemStatusOptions(item).find((option) => option.value === item.status)?.label
  || itemStatusLabels[item.status]
  || item.status;`;

if (!source.includes('const itemStatusProfiles: Record<ItemStatusProfileKey, ItemStatusOption[]>')) {
  if (!source.includes(statusLabelsMarker)) throw new Error('itemStatusLabels marker not found');
  source = source.replace(statusLabelsMarker, contextualStatusConfig);
}

const replaceOnce = (oldValue, newValue, label) => {
  if (source.includes(newValue)) return;
  const matches = source.split(oldValue).length - 1;
  if (matches !== 1) throw new Error(`${label}: expected exactly one match, found ${matches}`);
  source = source.replace(oldValue, newValue);
};

replaceOnce(
  '${html(itemStatusLabels[item.status] || item.status)}',
  '${html(getItemStatusLabel(item))}',
  'print status label',
);
replaceOnce(
  '{itemStatusLabels[item.status]}',
  '{getItemStatusLabel(item)}',
  'read-only status label',
);
replaceOnce(
  '{Object.entries(itemStatusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}',
  '{getItemStatusOptions(item).map(({ value, label }) => <option key={value} value={value}>{label}</option>)}',
  'contextual result options',
);
replaceOnce(
  'className="lg:w-44" value={item.status}',
  'className="lg:w-64" value={item.status}',
  'result dropdown width',
);
replaceOnce(
  'أكمل جميع البنود قبل اعتماد الزيارة كمكتملة.',
  'تتغير خيارات النتيجة تلقائيًا حسب نوع بند الفحص، وأكمل جميع البنود قبل اعتماد الزيارة كمكتملة.',
  'checklist helper text',
);

fs.writeFileSync(filePath, source);
console.log('Applied contextual status options to mosque field-visit checklist.');
