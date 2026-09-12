import type { AccountingTransformationAttachment } from '../../types/accountingTransformation';

export type PropertyEvidenceStatus = 'available' | 'missing' | 'needs_update';

export type PropertyEvidenceRequirement = {
  key: string;
  label: string;
  description: string;
  aliases: string[];
};

const normalize = (value: unknown) => String(value ?? '')
  .trim()
  .toLowerCase()
  .replace(/[أإآ]/g, 'ا')
  .replace(/ى/g, 'ي')
  .replace(/ة/g, 'ه')
  .replace(/[()،,._/\\-]/g, ' ')
  .replace(/\s+/g, ' ');

const REQUIREMENTS: Record<string, PropertyEvidenceRequirement[]> = {
  'kfu-hospital': [
    {
      key: 'relationship-agreement',
      label: 'اتفاقية الإعارة / التشغيل',
      description: 'نسخة الاتفاقية أو المستند الذي يثبت إعارة المستشفى للجامعة وحقوق الإدارة والتشغيل والصيانة.',
      aliases: ['اتفاقية اعارة', 'اتفاقية تشغيل', 'مشروع اتفاقية اعارة', 'تشغيل المستشفى'],
    },
    {
      key: 'extension-approval',
      label: 'مستند تمديد الإعارة',
      description: 'الموافقة أو المستند المؤيد لاستمرار أو تمديد الإعارة بعد المدة الأساسية.',
      aliases: ['تمديد الاعارة', 'تمديد الإعارة', 'موافقة التمديد', 'استمرار الاعارة'],
    },
    {
      key: 'owner-title',
      label: 'مستند ملكية وزارة الصحة',
      description: 'مستند أو سند يثبت الملكية النظامية لوزارة الصحة للعقار محل الانتفاع.',
      aliases: ['وزارة الصحة', 'ملكية وزارة الصحة', 'سند الملكية', 'صك الملكية'],
    },
    {
      key: 'improvements-reversion',
      label: 'مستندات التحسينات وحق الرجوع / التعويض',
      description: 'ما يؤيد معالجة التحسينات وحق الرجوع أو التعويض عند انتهاء العلاقة.',
      aliases: ['التحسينات', 'حق الرجوع', 'التعويض', 'reversion', 'compensation'],
    },
  ],
  'half-moon-center': [
    {
      key: 'usufruct-contract',
      label: 'عقد الانتفاع / إيجار الأرض دون مقابل',
      description: 'نسخة العقد الكامل الذي يحدد أساس الانتفاع بالأرض دون مقابل.',
      aliases: ['عقد انتفاع', 'عقد ايجار ارض', 'دون مقابل', 'شاطئ نصف القمر'],
    },
    {
      key: 'renewal-validity',
      label: 'ما يثبت استمرار أو تجديد الانتفاع',
      description: 'مستند أو ما يثبت استمرار نفاذ العقد أو التجديد الحالي وفق شروطه.',
      aliases: ['تجديد', 'استمرار العقد', 'استمرار الانتفاع', 'نفاذ العقد'],
    },
    {
      key: 'disposal-maintenance-terms',
      label: 'بنود حدود التصرف والصيانة',
      description: 'المستند أو البنود التي توضح حدود التصرف ومسؤوليات التشغيل والصيانة.',
      aliases: ['حدود التصرف', 'الصيانة', 'التشغيل', 'مسؤوليات الصيانة'],
    },
  ],
  'jubail-college': [
    {
      key: 'cooperation-agreement',
      label: 'اتفاقية / مذكرة التعاون المشترك',
      description: 'نسخة الاتفاقية أو المذكرة التي خصص بموجبها المبنى أو المرافق للجامعة.',
      aliases: ['اتفاقية تعاون', 'مذكرة تعاون', 'التعاون المشترك', 'تخصيص مبنى مؤقت'],
    },
    {
      key: 'term-renewal',
      label: 'مستند مدة الاستخدام / التجديد',
      description: 'ما يثبت مدة الانتفاع الحالية وأي تجديدات أو تمديدات لاحقة.',
      aliases: ['مدة الاستخدام', 'مدة الانتفاع', 'التجديد', 'ثلاث سنوات'],
    },
    {
      key: 'access-boundaries',
      label: 'مستند حدود الوصول والاستخدام',
      description: 'ما يحدد نطاق المرافق المتاحة للجامعة وحدود الوصول أو التقييد عليها.',
      aliases: ['حدود الوصول', 'نطاق الاستخدام', 'المرافق', 'الوصول'],
    },
  ],
  'education-college': [
    {
      key: 'royal-decision',
      label: 'القرار السامي بنقل الملكية',
      description: 'نسخة القرار السامي بنقل ملكية الأرض وما عليها للجامعة.',
      aliases: ['قرار سامي', 'نقل الملكية', 'كلية التربية', 'المعلمين سابقا'],
    },
    {
      key: 'transfer-status',
      label: 'مستند حالة استكمال نقل الملكية',
      description: 'ما يثبت الإجراء الحالي لنقل الملكية والجهة التي وصل إليها الإجراء.',
      aliases: ['جاري نقل الملكية', 'استكمال نقل الملكية', 'حالة نقل الملكية', 'نقل الملكية'],
    },
    {
      key: 'updated-deed',
      label: 'الصك / مستند الملكية بعد اكتمال النقل',
      description: 'الصك أو مستند الملكية المحدث بعد اكتمال إجراءات نقل الملكية للجامعة.',
      aliases: ['الصك', 'صك الملكية', 'مستند الملكية', 'تحديث الصك'],
    },
  ],
};

export const getPropertyEvidenceRequirements = (profileId?: string | null) =>
  profileId ? (REQUIREMENTS[profileId] || []) : [];

export const findMatchingPropertyEvidenceAttachment = (
  requirement: PropertyEvidenceRequirement,
  attachments: AccountingTransformationAttachment[] = []
) => attachments.find((attachment) => {
  const searchable = normalize([
    attachment.title,
    attachment.documentType,
    attachment.documentNumber,
    attachment.archiveNumber,
    attachment.notes,
  ].filter(Boolean).join(' '));
  return requirement.aliases.some((alias) => searchable.includes(normalize(alias)));
});
