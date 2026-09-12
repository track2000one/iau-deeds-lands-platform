import type { AccountingTransformationRecord } from '../../types/accountingTransformation';

export type MemoIndicatorValue = 'yes' | 'partial' | 'no' | 'unknown';
export type MemoDocumentCompleteness = 'complete' | 'partial' | 'missing';
export type MemoAnalysisLevel = 'strong_needs_approval' | 'needs_more_study' | 'insufficient' | 'undetermined';

export type PropertyControlMemoProfile = {
  id: 'kfu-hospital' | 'half-moon-center' | 'jubail-college' | 'education-college';
  title: string;
  aliases: string[];
  ownerAliases: string[];
  locationTerms: string[];
  sourceLabel: string;
  referenceScore: number;
  relationshipType: string;
  documentReference: string;
  documentSummary: string;
  universityUse: string;
  legalOwnership: MemoIndicatorValue;
  accessControl: MemoIndicatorValue;
  universityPurposeUse: MemoIndicatorValue;
  enforceableRight: MemoIndicatorValue;
  operationsMaintenance: MemoIndicatorValue;
  improvementFunding: string;
  reversionCompensation: string;
  benefitTerm: string;
  documentCompleteness: MemoDocumentCompleteness;
  analysisLevel: MemoAnalysisLevel;
  recognitionConditions: string;
  proposedTreatment: string;
  nextAction: string;
  responsible: string;
  notes: string;
};

const normalize = (value: unknown) => String(value ?? '')
  .trim()
  .toLowerCase()
  .replace(/[أإآ]/g, 'ا')
  .replace(/ى/g, 'ي')
  .replace(/ة/g, 'ه')
  .replace(/[()،,._/\\-]/g, ' ')
  .replace(/\s+/g, ' ');

const includesAny = (haystack: string, values: string[]) => values.some((value) => haystack.includes(normalize(value)));

export const PROPERTY_CONTROL_MEMO_PROFILES: PropertyControlMemoProfile[] = [
  {
    id: 'kfu-hospital',
    title: 'مستشفى الملك فهد الجامعي',
    aliases: ['مستشفى الملك فهد الجامعي', 'king fahd university hospital'],
    ownerAliases: ['وزارة الصحة', 'ministry of health'],
    locationTerms: ['الخبر', 'العقربية'],
    sourceLabel: 'مذكرة مؤشرات السيطرة على العقارات - بطاقة رقم (1)',
    referenceScore: 10,
    relationshipType: 'مشروع اتفاقية إعارة مستشفى الملك فهد الجامعي',
    documentReference: '25/07/1400هـ - تاريخ بدء الاستلام/الإعارة',
    documentSummary: 'إعارة المستشفى للجامعة وتولي إدارته وتشغيله وصيانته واستخدامه للأغراض العلاجية والتعليمية.',
    universityUse: 'إدارة وتشغيل المستشفى الجامعي للأغراض العلاجية والتعليمية.',
    legalOwnership: 'no',
    accessControl: 'yes',
    universityPurposeUse: 'yes',
    enforceableRight: 'yes',
    operationsMaintenance: 'yes',
    improvementFunding: 'نعم',
    reversionCompensation: 'نعم',
    benefitTerm: 'خمس سنوات قابلة للتجديد بموافقة الطرفين، ثم صدرت موافقة لاحقة بتمديد الإعارة.',
    documentCompleteness: 'partial',
    analysisLevel: 'strong_needs_approval',
    recognitionConditions: 'استكمال سند الملكية ومستندات تمديد الإعارة والتحقق من استمرار حق الانتفاع وتحليل معالجة التحسينات وحق الرجوع.',
    proposedTreatment: 'إعداد مذكرة محاسبية تفصيلية ورفعها للاعتماد قبل الإدراج في سجل الأصول.',
    nextAction: 'استكمال رقم وتاريخ المستندات وتحليل حق النفاذ والرجوع/التعويض قبل الاعتماد النهائي، والتحقق من مستند تمديد الإعارة وسند ملكية وزارة الصحة والوضع النظامي الحالي للإعارة.',
    responsible: 'وحدة الأصول / الإدارة المالية',
    notes: 'الملكية النظامية لوزارة الصحة، مع تشغيل وتحكم من الجامعة وفق ما ورد في المذكرة.',
  },
  {
    id: 'half-moon-center',
    title: 'المركز الترفيهي',
    aliases: ['المركز الترفيهي', 'شاطئ نصف القمر', 'half moon'],
    ownerAliases: ['امانة المنطقة الشرقية', 'أمانة المنطقة الشرقية', 'eastern province municipality'],
    locationTerms: ['الخبر', 'شاطئ نصف القمر', 'نصف القمر'],
    sourceLabel: 'مذكرة مؤشرات السيطرة على العقارات - بطاقة رقم (2)',
    referenceScore: 5,
    relationshipType: 'عقد انتفاع - دون مقابل',
    documentReference: '29/12/1413هـ الموافق 19/06/1993م',
    documentSummary: 'عقد إيجار أرض بدون مقابل لإقامة منشآت ترفيهية وتعليمية وبحثية لخدمة الجامعة ومنسوبيها.',
    universityUse: 'منشآت ترفيهية وتعليمية وبحثية لخدمة الجامعة ومنسوبيها.',
    legalOwnership: 'no',
    accessControl: 'partial',
    universityPurposeUse: 'yes',
    enforceableRight: 'yes',
    operationsMaintenance: 'yes',
    improvementFunding: 'نعم',
    reversionCompensation: 'نعم',
    benefitTerm: '25 سنة من تاريخ توقيع العقد، ويتجدد ذاتيًا ما لم يتفق الطرفان على غير ذلك.',
    documentCompleteness: 'partial',
    analysisLevel: 'needs_more_study',
    recognitionConditions: 'الاستمرار في الانتفاع.',
    proposedTreatment: 'الاستمرار في الانتفاع.',
    nextAction: 'استمرار العقد والتجديد.',
    responsible: 'جامعة الإمام عبدالرحمن بن فيصل',
    notes: '',
  },
  {
    id: 'jubail-college',
    title: 'كلية العلوم الطبية التطبيقية بمدينة الجبيل الصناعية',
    aliases: [
      'كلية العلوم الطبية التطبيقية بمدينة الجبيل الصناعية',
      'كلية العلوم الطبية التطبيقية بالجبيل',
      'الكلية التطبيقية للبنات بالجبيل',
      'الكلية التطبيقية بالجبيل',
    ],
    ownerAliases: ['الهيئة الملكية الجبيل وينبع', 'الهيئة الملكية بالجبيل وينبع', 'الهيئة الملكية بالجبيل', 'royal commission'],
    locationTerms: ['الجبيل', 'مدينة الجبيل الصناعية'],
    sourceLabel: 'مذكرة مؤشرات السيطرة على العقارات - بطاقة رقم (3)',
    referenceScore: 5,
    relationshipType: 'مذكرة تعاون مشترك تتضمن تخصيص مبنى مؤقت للجامعة للانتفاع به',
    documentReference: 'بداية عام 2016م',
    documentSummary: 'مذكرة تعاون لتخصيص مبنى مؤقت مقرًا لكلية العلوم الطبية التطبيقية بالجبيل.',
    universityUse: 'استخدام مرافق للتعليم.',
    legalOwnership: 'no',
    accessControl: 'partial',
    universityPurposeUse: 'yes',
    enforceableRight: 'yes',
    operationsMaintenance: 'partial',
    improvementFunding: '-',
    reversionCompensation: 'نعم',
    benefitTerm: 'ثلاث سنوات هجرية من تاريخ التوقيع، قابلة للتجديد باتفاق الطرفين.',
    documentCompleteness: 'partial',
    analysisLevel: 'undetermined',
    recognitionConditions: 'استمرار حق الانتفاع الحالي.',
    proposedTreatment: 'الاستمرار في الانتفاع.',
    nextAction: 'الاستمرار في الانتفاع.',
    responsible: 'جامعة الإمام عبدالرحمن بن فيصل',
    notes: 'مستوى التحليل في البطاقة التفصيلية بالمذكرة ورد بعلامة (-)، لذلك لم يُستنتج مستوى آلي بديل.',
  },
  {
    id: 'education-college',
    title: 'كلية التربية (المعلمين سابقًا)',
    aliases: ['كلية التربية', 'المعلمين سابقا', 'كلية المعلمين', 'المريكبات'],
    ownerAliases: ['وزارة التعليم', 'ministry of education'],
    locationTerms: ['الدمام', 'المريكبات'],
    sourceLabel: 'مذكرة مؤشرات السيطرة على العقارات - بطاقة رقم (4)',
    referenceScore: 10,
    relationshipType: 'قرار سامي بنقل ملكية الأرض وما عليها للجامعة - جاري العمل على نقل الملكية',
    documentReference: 'غير مدخل',
    documentSummary: 'قرار سامي بنقل ملكية الأرض وما عليها للجامعة، وجارٍ العمل على نقل الملكية - تعليم.',
    universityUse: 'تعليم.',
    legalOwnership: 'yes',
    accessControl: 'yes',
    universityPurposeUse: 'yes',
    enforceableRight: 'yes',
    operationsMaintenance: 'yes',
    improvementFunding: '-',
    reversionCompensation: 'قرار سامي بنقل ملكية الأرض وما عليها للجامعة، وجارٍ العمل على نقل الملكية.',
    benefitTerm: 'قرار سامي بنقل ملكية الأرض وما عليها للجامعة، وجارٍ العمل على نقل الملكية.',
    documentCompleteness: 'partial',
    analysisLevel: 'undetermined',
    recognitionConditions: 'قرار سامي بنقل ملكية الأرض وما عليها للجامعة، وجارٍ العمل على نقل الملكية.',
    proposedTreatment: 'قرار سامي بنقل ملكية الأرض وما عليها للجامعة، وجارٍ العمل على نقل الملكية.',
    nextAction: 'استكمال إجراءات نقل ملكية الأرض وما عليها للجامعة.',
    responsible: 'جامعة الإمام عبدالرحمن بن فيصل',
    notes: 'الجهة المالكة حسب المستند: وزارة التعليم حتى اكتمال النقل. حقل «مستوى التحليل» في البطاقة التفصيلية لا يتضمن تصنيفًا صريحًا؛ لذلك لم يُستنتج تصنيف آلي.',
  },
];

const searchableRecordText = (record: AccountingTransformationRecord) => normalize([
  record.assetDescription,
  record.entityAssetNumber,
  record.city,
  record.recordNumber,
  record.payload?.G,
  record.payload?.V,
  record.payload?.W,
  record.payload?.AM,
  record.payload?.AC,
].filter(Boolean).join(' '));

export const findPropertyControlMemoProfile = (record: AccountingTransformationRecord): PropertyControlMemoProfile | undefined => {
  const text = searchableRecordText(record);
  if (!text) return undefined;

  return PROPERTY_CONTROL_MEMO_PROFILES.find((profile) => {
    const aliasMatch = includesAny(text, profile.aliases);
    if (!aliasMatch) return false;
    const ownerMatch = includesAny(text, profile.ownerAliases);
    const locationMatch = includesAny(text, profile.locationTerms);
    return ownerMatch || locationMatch;
  });
};

export const memoProfileToAnalysisSeed = (profile: PropertyControlMemoProfile) => ({
  relationshipType: profile.relationshipType,
  documentReference: profile.documentReference,
  documentSummary: profile.documentSummary,
  universityUse: profile.universityUse,
  legalOwnership: profile.legalOwnership,
  accessControl: profile.accessControl,
  universityPurposeUse: profile.universityPurposeUse,
  enforceableRight: profile.enforceableRight,
  operationsMaintenance: profile.operationsMaintenance,
  improvementFunding: profile.improvementFunding,
  reversionCompensation: profile.reversionCompensation,
  benefitTerm: profile.benefitTerm,
  documentCompleteness: profile.documentCompleteness,
  analysisLevel: profile.analysisLevel,
  recognitionConditions: profile.recognitionConditions,
  proposedTreatment: profile.proposedTreatment,
  nextAction: profile.nextAction,
  responsible: profile.responsible,
  notes: profile.notes,
  memoProfileId: profile.id,
  memoSourceLabel: profile.sourceLabel,
  memoReferenceScore: profile.referenceScore,
});
