import React, { useMemo } from 'react';
import { FileSpreadsheet, Landmark, Layers3, MapPin, PackageSearch } from 'lucide-react';
import { AppDateField } from './AppDateField';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import type { AssetInput } from '../../types/asset';

type TemplateType = 'ppe' | 'transport' | 'furniture' | 'infrastructure' | 'intangible' | 'land';
type ExtraFieldType = 'text' | 'number' | 'date' | 'select';

type ExtraField = {
  key: string;
  label: string;
  type?: ExtraFieldType;
  placeholder?: string;
  options?: string[];
};

const TEMPLATE_OPTIONS: Array<{ value: TemplateType; label: string; description: string }> = [
  { value: 'ppe', label: 'الآلات والمعدات', description: 'نموذج PPE المعتمد' },
  { value: 'transport', label: 'أصول النقل العام', description: 'المركبات وأصول النقل' },
  { value: 'furniture', label: 'الأثاث', description: 'الأثاث والتجهيزات المكتبية' },
  { value: 'infrastructure', label: 'البنية التحتية', description: 'شبكات وأعمال البنية التحتية' },
  { value: 'intangible', label: 'الأصول غير الملموسة', description: 'البرامج والرخص والحقوق' },
  { value: 'land', label: 'الأراضي', description: 'بيانات الأصول العقارية وفق النموذج المالي' },
];

const COMMON_EXTRAS: ExtraField[] = [
  { key: 'country', label: 'الدولة', placeholder: 'المملكة العربية السعودية' },
  { key: 'assetOwner', label: 'مالك الأصل', placeholder: 'جامعة الإمام عبدالرحمن بن فيصل' },
  { key: 'acquisitionMethod', label: 'آلية الاستحواذ' },
  { key: 'mofUniqueAssetNumber', label: 'رقم الأصل الفريد في نظام وزارة المالية' },
  { key: 'entityUniqueAssetNumber', label: 'رقم الأصل الفريد بالجهة' },
  { key: 'classification1English', label: 'تصنيف المستوى الأول - إنجليزي' },
  { key: 'classification1Code', label: 'رمز تصنيف المستوى الأول' },
  { key: 'classification2English', label: 'تصنيف المستوى الثاني - إنجليزي' },
  { key: 'classification2Code', label: 'رمز تصنيف المستوى الثاني' },
  { key: 'classification3English', label: 'تصنيف المستوى الثالث - إنجليزي' },
  { key: 'classification3Code', label: 'رمز تصنيف المستوى الثالث' },
  { key: 'accountingGroupEnglish', label: 'المجموعة المحاسبية - إنجليزي' },
  { key: 'valuationMethod', label: 'طريقة التقييم' },
  { key: 'valuationReportDate', label: 'تاريخ تقرير التقييم', type: 'date' },
  { key: 'openingBalanceDate', label: 'تاريخ القوائم الافتتاحية', type: 'date' },
  { key: 'openingValue', label: 'القيمة الافتتاحية', type: 'number' },
  { key: 'valuationReportReference', label: 'رقم وثيقة تقرير التقييم' },
  { key: 'glAccount', label: 'رقم شجرة الحسابات' },
  { key: 'costCenter', label: 'مركز التكلفة' },
];

const TEMPLATE_FIELDS: Record<TemplateType, ExtraField[]> = {
  ppe: [
    { key: 'maintenanceFunctionalCode', label: 'رمز الأصل لغرض الصيانة' },
    { key: 'capacityUnit', label: 'وحدة قياس السعة' },
    { key: 'capacityMeasurementType', label: 'نوع معامل السعة' },
    { key: 'capacityValue', label: 'قيمة معامل السعة', type: 'number' },
    { key: 'assetUtilization', label: 'حالة استغلال الأصل', options: ['يعمل بشكل دائم', 'احتياطي', 'غير مستخدم'] , type: 'select'},
    { key: 'replacementValue', label: 'تكلفة استبدال الأصل', type: 'number' },
    { key: 'insurancePolicyNumber', label: 'رقم بوليصة التأمين' },
  ],
  transport: [
    { key: 'yearOfManufacture', label: 'سنة الصنع', type: 'number' },
    { key: 'registrationPlateNumber', label: 'رقم التسجيل / اللوحة' },
    { key: 'capacityUnit', label: 'وحدة قياس السعة' },
    { key: 'capacityMeasurementType', label: 'نوع معامل السعة' },
    { key: 'capacityValue', label: 'قيمة معامل السعة', type: 'number' },
    { key: 'consumptionUnit', label: 'وحدة معامل الاستهلاك' },
    { key: 'consumptionMeasurementType', label: 'نوع معامل الاستهلاك' },
    { key: 'consumptionValue', label: 'قيمة معامل الاستهلاك', type: 'number' },
    { key: 'assetUtilization', label: 'حالة استغلال الأصل', options: ['يعمل بشكل دائم', 'احتياطي', 'غير مستخدم'], type: 'select' },
    { key: 'replacementValue', label: 'تكلفة استبدال الأصل', type: 'number' },
    { key: 'insurancePolicyNumber', label: 'رقم بوليصة التأمين' },
  ],
  furniture: [
    { key: 'nationalAddressId', label: 'العنوان الوطني' },
    { key: 'oldTagNumber', label: 'رقم البطاقة القديم' },
    { key: 'retirementPlanDate', label: 'تاريخ الاستبعاد / التطوير', type: 'date' },
    { key: 'supportingDocumentType', label: 'نوع الوثائق الداعمة' },
    { key: 'supportingDocumentNumber', label: 'رقم الوثيقة الداعمة' },
    { key: 'assetPhotoArchiveNumber', label: 'رقم أرشفة صورة الأصل' },
    { key: 'officialLocation', label: 'Location / الموقع الرسمي' },
    { key: 'depreciationAmount', label: 'قسط الإهلاك', type: 'number' },
    { key: 'accumulatedDepreciation', label: 'الاستهلاك المتراكم', type: 'number' },
    { key: 'residualValue', label: 'القيمة المتبقية في نهاية العمر', type: 'number' },
    { key: 'netBookValue', label: 'القيمة الدفترية', type: 'number' },
  ],
  infrastructure: [
    { key: 'geographicalCoordinates2', label: 'الإحداثيات الإضافية' },
    { key: 'nationalAddressId', label: 'العنوان الوطني' },
    { key: 'linkedAssetNumber', label: 'رقم الأصل المرتبط به' },
    { key: 'retirementPlanDate', label: 'تاريخ الاستبعاد / التطوير', type: 'date' },
    { key: 'supportingDocumentType', label: 'نوع الوثائق الداعمة' },
    { key: 'supportingDocumentNumber', label: 'رقم الوثيقة الداعمة' },
  ],
  intangible: [
    { key: 'version', label: 'النسخة' },
    { key: 'developer', label: 'المطور' },
    { key: 'licenseExpirationDate', label: 'تاريخ انتهاء الرخصة', type: 'date' },
    { key: 'assetUtilization', label: 'حالة استغلال الأصل', options: ['مستخدم', 'غير مستخدم', 'مستخدم جزئيًا'], type: 'select' },
    { key: 'retirementPlanDate', label: 'تاريخ الاستبعاد / التطوير', type: 'date' },
    { key: 'indefiniteLifeReason', label: 'أسباب العمر الخدمي غير المحدود' },
    { key: 'supportingDocumentType', label: 'نوع الوثائق الداعمة' },
    { key: 'supportingDocumentNumber', label: 'رقم الوثيقة الداعمة' },
    { key: 'linkedAssetNumber', label: 'رقم الأصل المرتبط به' },
    { key: 'officialLocation', label: 'Location / الموقع الرسمي' },
    { key: 'depreciationAmount', label: 'قسط الإهلاك', type: 'number' },
    { key: 'accumulatedDepreciation', label: 'الاستهلاك المتراكم', type: 'number' },
    { key: 'residualValue', label: 'القيمة المتبقية في نهاية العمر', type: 'number' },
    { key: 'netBookValue', label: 'القيمة الدفترية', type: 'number' },
  ],
  land: [
    { key: 'linkedAssetNumber', label: 'الأصل المرتبط به' },
    { key: 'landArea', label: 'مساحة الأرض م²', type: 'number' },
    { key: 'landUseType', label: 'نوع استخدام الأرض' },
    { key: 'leaseTerminationPlan', label: 'خطة إنهاء عقد الاستئجار', options: ['نعم', 'لا'], type: 'select' },
    { key: 'nationalAddressId', label: 'العنوان الوطني' },
    { key: 'ownershipDocumentType', label: 'نوع وثيقة الملكية / الإثبات' },
    { key: 'ownershipCertificateDate', label: 'تاريخ وثيقة التملك', type: 'date' },
    { key: 'deedLandArea', label: 'المساحة حسب الصك', type: 'number' },
    { key: 'allowedFloors', label: 'عدد الأدوار المسموح بناؤها', type: 'number' },
    { key: 'landLength', label: 'طول الأرض', type: 'number' },
    { key: 'landWidth', label: 'عرض الأرض', type: 'number' },
    { key: 'district', label: 'الحي / المخطط' },
    { key: 'plotNumber', label: 'رقم القطعة' },
    { key: 'streetName', label: 'اسم الشارع' },
    { key: 'streetFrontsCount', label: 'عدد الواجهات', type: 'number' },
    { key: 'streetFrontsDirection', label: 'اتجاه الواجهات' },
    { key: 'hasLeaseRevenue', label: 'هل يوجد إيراد سنوي من التأجير؟', options: ['نعم', 'لا'], type: 'select' },
    { key: 'leasedAssetType', label: 'نوع الأصل / الجزء المؤجر' },
    { key: 'annualRevenue', label: 'إجمالي الإيرادات السنوية', type: 'number' },
    { key: 'mainLessee', label: 'المستأجر الرئيسي' },
    { key: 'leaseStartDate', label: 'تاريخ بداية عقد الإيجار', type: 'date' },
    { key: 'leaseDuration', label: 'مدة عقد الإيجار' },
  ],
};

const numberValue = (value: unknown) => (value === null || value === undefined ? '' : String(value));

export const AssetOfficialTemplateFields: React.FC<{
  value: AssetInput;
  onChange: (next: AssetInput) => void;
}> = ({ value, onChange }) => {
  const payload = (value.excelPayload || {}) as Record<string, unknown>;
  const templateType = (String(payload.templateType || 'ppe') as TemplateType);
  const template = TEMPLATE_OPTIONS.find((item) => item.value === templateType) || TEMPLATE_OPTIONS[0];

  const setField = <K extends keyof AssetInput>(key: K, fieldValue: AssetInput[K]) => {
    onChange({ ...value, [key]: fieldValue });
  };

  const setExtra = (key: string, fieldValue: unknown) => {
    onChange({
      ...value,
      excelPayload: {
        ...payload,
        [key]: fieldValue,
      },
    });
  };

  const extras = useMemo(() => [...COMMON_EXTRAS, ...TEMPLATE_FIELDS[templateType]], [templateType]);

  return (
    <Card className="rounded-[28px] border-white/55 bg-white/70 shadow-[0_16px_48px_rgba(15,23,42,0.07)] backdrop-blur-xl">
      <CardHeader className="border-b bg-white/40">
        <CardTitle className="flex items-center gap-2 text-lg">
          <FileSpreadsheet className="h-5 w-5 text-emerald-600" />
          بيانات النموذج الرسمي للأصول
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6 p-5 sm:p-6">
        <div className="rounded-2xl border border-emerald-200/70 bg-emerald-50/60 p-4">
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_2fr] lg:items-end">
            <div className="space-y-2">
              <Label>نوع النموذج المعتمد *</Label>
              <Select
                value={templateType}
                onValueChange={(next) => setExtra('templateType', next as TemplateType)}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {TEMPLATE_OPTIONS.map((item) => (
                    <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <p className="font-bold text-emerald-900">{template.label}</p>
              <p className="mt-1 text-sm text-emerald-800/80">{template.description}. الحقول أدناه مستمدة من ملفات Excel المعتمدة، وتحفظ مع سجل الأصل لاستخدامها في التقارير والتصدير الرسمي.</p>
            </div>
          </div>
        </div>

        <section className="space-y-4">
          <div className="flex items-center gap-2">
            <Landmark className="h-5 w-5 text-primary" />
            <h3 className="font-black">البيانات المؤسسية والتصنيف المالي</h3>
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            <div className="space-y-2"><Label>اسم الجهة</Label><Input value={value.entityName || ''} onChange={(e) => setField('entityName', e.target.value)} placeholder="جامعة الإمام عبدالرحمن بن فيصل" /></div>
            <div className="space-y-2"><Label>رمز الجهة</Label><Input value={value.entityCode || ''} onChange={(e) => setField('entityCode', e.target.value)} placeholder="29" /></div>
            <div className="space-y-2"><Label>وصف الأصل الرسمي</Label><Input value={value.assetDescription || ''} onChange={(e) => setField('assetDescription', e.target.value)} /></div>
            <div className="space-y-2"><Label>رقم البطاقة</Label><Input value={value.cardNumber || ''} onChange={(e) => setField('cardNumber', e.target.value)} /></div>
            <div className="space-y-2"><Label>الإدارة / القسم المسؤول</Label><Input value={value.responsibleDepartment || ''} onChange={(e) => setField('responsibleDepartment', e.target.value)} /></div>
            <div className="space-y-2"><Label>الحالة الفنية للأصل</Label><Input value={value.technicalCondition || ''} onChange={(e) => setField('technicalCondition', e.target.value)} placeholder="ممتاز / جيد جداً / جيد ..." /></div>
            <div className="space-y-2"><Label>التصنيف المستوى الأول - عربي</Label><Input value={value.classification1 || ''} onChange={(e) => setField('classification1', e.target.value)} /></div>
            <div className="space-y-2"><Label>التصنيف المستوى الثاني - عربي</Label><Input value={value.classification2 || ''} onChange={(e) => setField('classification2', e.target.value)} /></div>
            <div className="space-y-2"><Label>التصنيف المستوى الثالث - عربي</Label><Input value={value.classification3 || ''} onChange={(e) => setField('classification3', e.target.value)} /></div>
            <div className="space-y-2"><Label>المجموعة المحاسبية - عربي</Label><Input value={value.accountingGroup || ''} onChange={(e) => setField('accountingGroup', e.target.value)} /></div>
            <div className="space-y-2"><Label>رمز المجموعة المحاسبية</Label><Input value={value.accountingGroupCode || ''} onChange={(e) => setField('accountingGroupCode', e.target.value)} /></div>
            <div className="space-y-2"><Label>رمز الأصل للغرض المحاسبي</Label><Input value={value.assetCode || ''} onChange={(e) => setField('assetCode', e.target.value)} /></div>
            <div className="space-y-2"><Label>العمر المتبقي</Label><Input type="number" value={numberValue(value.remainingLife)} onChange={(e) => setField('remainingLife', e.target.value === '' ? null : Number(e.target.value))} /></div>
            <div className="space-y-2"><Label>العمر الإنتاجي</Label><Input type="number" value={numberValue(value.usefulLife)} onChange={(e) => setField('usefulLife', e.target.value === '' ? null : Number(e.target.value))} /></div>
          </div>
        </section>

        <section className="space-y-4">
          <div className="flex items-center gap-2"><MapPin className="h-5 w-5 text-primary" /><h3 className="font-black">الموقع والتكلفة والتوثيق</h3></div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            <div className="space-y-2"><Label>المنطقة</Label><Input value={value.region || ''} onChange={(e) => setField('region', e.target.value)} /></div>
            <div className="space-y-2"><Label>المدينة</Label><Input value={value.city || ''} onChange={(e) => setField('city', e.target.value)} /></div>
            <div className="space-y-2"><Label>رقم المبنى</Label><Input value={value.buildingNumber || ''} onChange={(e) => setField('buildingNumber', e.target.value)} /></div>
            <div className="space-y-2"><Label>الإحداثيات</Label><Input value={value.coordinates || ''} onChange={(e) => setField('coordinates', e.target.value)} placeholder="26.000000, 50.000000" /></div>
            <AppDateField label="تاريخ الدخول في الخدمة" value={value.serviceDate || ''} dateType={value.serviceDateType || 'gregorian'} onChange={(date) => setField('serviceDate', date)} onTypeChange={(type) => setField('serviceDateType', type)} />
            <AppDateField label="تاريخ الاقتناء" value={value.purchaseDate || ''} dateType={value.purchaseDateType || 'gregorian'} onChange={(date) => setField('purchaseDate', date)} onTypeChange={(type) => setField('purchaseDateType', type)} />
            <div className="space-y-2"><Label>تكلفة الاقتناء</Label><Input type="number" value={numberValue(value.acquisitionCost)} onChange={(e) => setField('acquisitionCost', e.target.value === '' ? null : Number(e.target.value))} /></div>
            <div className="space-y-2"><Label>الوثائق الداعمة لتكلفة الاقتناء</Label><Input value={value.supportingCostDocument || ''} onChange={(e) => setField('supportingCostDocument', e.target.value)} /></div>
            <div className="space-y-2"><Label>رقم الأرشفة لوثيقة إثبات الأصل</Label><Input value={value.archiveDocumentNumber || ''} onChange={(e) => setField('archiveDocumentNumber', e.target.value)} /></div>
            <div className="space-y-2"><Label>المصنع</Label><Input value={value.manufacturer || ''} onChange={(e) => setField('manufacturer', e.target.value)} /></div>
            <AppDateField label="تاريخ التحقق الميداني" value={value.lastInventoryDate || ''} dateType={value.lastInventoryDateType || 'gregorian'} onChange={(date) => setField('lastInventoryDate', date)} onTypeChange={(type) => setField('lastInventoryDateType', type)} />
            <div className="space-y-2"><Label>وحدة القياس</Label><Input value={value.unitOfMeasure || ''} onChange={(e) => setField('unitOfMeasure', e.target.value)} /></div>
            <div className="space-y-2"><Label>العدد / الكمية</Label><Input type="number" value={numberValue(value.quantity)} onChange={(e) => setField('quantity', e.target.value === '' ? null : Number(e.target.value))} /></div>
          </div>
        </section>

        <section className="space-y-4">
          <div className="flex items-center gap-2"><Layers3 className="h-5 w-5 text-primary" /><h3 className="font-black">الحقول الإضافية حسب النموذج المعتمد</h3></div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {extras.map((field) => (
              <div key={field.key} className="space-y-2">
                <Label>{field.label}</Label>
                {field.type === 'select' ? (
                  <Select value={String(payload[field.key] || '')} onValueChange={(next) => setExtra(field.key, next)}>
                    <SelectTrigger><SelectValue placeholder="اختر" /></SelectTrigger>
                    <SelectContent>{(field.options || []).map((option) => <SelectItem key={option} value={option}>{option}</SelectItem>)}</SelectContent>
                  </Select>
                ) : (
                  <Input
                    type={field.type === 'number' ? 'number' : field.type === 'date' ? 'date' : 'text'}
                    value={String(payload[field.key] ?? '')}
                    onChange={(e) => setExtra(field.key, field.type === 'number' && e.target.value !== '' ? Number(e.target.value) : e.target.value)}
                    placeholder={field.placeholder}
                  />
                )}
              </div>
            ))}
          </div>
        </section>

        <div className="flex items-start gap-3 rounded-2xl border border-dashed bg-background/55 p-4 text-sm text-muted-foreground">
          <PackageSearch className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
          <p>هذه الحقول مبنية على ملفات Excel المعتمدة: الآلات والمعدات، أصول النقل العام، الأثاث، البنية التحتية، الأصول غير الملموسة، والأراضي. تحفظ البيانات الإضافية داخل سجل الأصل لتكون جاهزة لاحقًا للتعبئة الآلية في نفس قوالب Excel دون تغيير تصميمها.</p>
        </div>
      </CardContent>
    </Card>
  );
};
