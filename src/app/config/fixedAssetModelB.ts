import type { AssetInput, AssetRecord } from '../../types/asset';

export type ModelBFieldClass = 'mandatory' | 'conditional' | 'automatic' | 'optional';
export type ModelBSection = 'entity' | 'sustainability' | 'classification' | 'identity' | 'accounting' | 'location' | 'disposal';

export type ModelBField = {
  column: string;
  english: string;
  arabic: string;
  section: ModelBSection;
  classification: ModelBFieldClass;
};

export const MODEL_B_VERSION = 'النسخة الثالثة';
export const MODEL_B_ISSUE_DATE = '2026-06-24';
export const MODEL_B_SHEET_NAME = 'سجل الأصول';

export const MODEL_B_PROCEDURES = ['إضافة', 'نقل', 'بيع', 'تحديث', 'إتلاف'] as const;
export const MODEL_B_VALUATION_METHODS = ['التكلفة التاريخية', 'التكلفة المفترضة'] as const;

const field = (column: string, english: string, arabic: string, section: ModelBSection, classification: ModelBFieldClass): ModelBField => ({
  column, english, arabic, section, classification,
});

export const MODEL_B_FIELDS: ModelBField[] = [
  field('A','Entity Name','اسم الجهة','entity','mandatory'),
  field('B','Entity Code','رمز الجهة','entity','mandatory'),
  field('C','Type of Procedure','نوع الإجراء','sustainability','conditional'),
  field('D','Level 1 FA Module Code','رمز تصنيف الأصول المستوى الأول','classification','automatic'),
  field('E','Level 1 FA Module - Arabic Description','وصف تصنيف الأصول المستوى الأول - عربي','classification','mandatory'),
  field('F','Level 1 FA Module - English Description','وصف تصنيف الأصول المستوى الأول - انجليزي','classification','automatic'),
  field('G','Level 2 FA Module Code','رمز تصنيف الأصول المستوى الثاني','classification','automatic'),
  field('H','Level 2 FA Module - Arabic Description','وصف تصنيف الأصول المستوى الثاني - عربي','classification','mandatory'),
  field('I','Level 2 FA Module - English Description','وصف تصنيف الأصول المستوى الثاني - انجليزي','classification','automatic'),
  field('J','Level 3 FA Module Code','رمز تصنيف الأصول المستوى الثالث','classification','automatic'),
  field('K','Level 3 FA Module - Arabic Description','وصف تصنيف الأصول المستوى الثالث - عربي','classification','mandatory'),
  field('L','Level 3 FA Module - English Description','وصف تصنيف الأصول المستوى الثالث - انجليزي','classification','automatic'),
  field('M','Accounting Group Code','رمز المجموعة المحاسبية','classification','automatic'),
  field('N','Accounting Group Arabic Description','وصف المجموعة المحاسبية - عربي','classification','mandatory'),
  field('O','Accounting Group English Description','وصف المجموعة المحاسبية - انجليزي','classification','automatic'),
  field('P','Asset Code For Accounting Purpose','رمز الأصل للغرض المحاسبي','classification','automatic'),
  field('Q','Asset Description For Maintenance Purpose','وصف الأصل لغرض الصيانة','classification','optional'),
  field('R','Asset Functional Code','رمز الأصل لغرض الصيانة (مشروعات)','classification','optional'),
  field('S','GL Account','رقم شجرة الحسابات','classification','automatic'),
  field('T','Cost Center','مركز التكلفة','classification','automatic'),
  field('U','Asset Owner','مالك الأصل','identity','mandatory'),
  field('V','Custodian','القسم أو الإدارة المسؤولة','identity','optional'),
  field('W','Consolidated Code','الترميز الموحد مع الصيانة','identity','optional'),
  field('X','Linked/Associated Asset','الأصل المرتبط به (الرقم الفريد للمبنى على الأرض - ان وجد)','identity','optional'),
  field('Y','Unique Asset Number in MoF System','رقم الأصل الفريد في نظام وزارة المالية (الرقم التعريفي)','identity','automatic'),
  field('Z','Unique Asset Number in the Entity','رقم الأصل الفريد بالجهة (الرقم المستخدم حاليا للأصل او رقم تسلسلي)','identity','automatic'),
  field('AA','Asset Description','وصف الأصل','identity','mandatory'),
  field('AB','Tag Number','رقم البطاقة','identity','mandatory'),
  field('AC','Base Unit of Measure','وحدة القياس','identity','mandatory'),
  field('AD','Quantity','العدد','identity','mandatory'),
  field('AE','Manufacturer','المصنّع','identity','mandatory'),
  field('AF','Date Placed in Service','تاريخ الدخول في الخدمة (DD/MM/YYYY)','accounting','mandatory'),
  field('AG','Valuation Method','طريقة التقييم','accounting','mandatory'),
  field('AH','Cost','التكلفة','accounting','mandatory'),
  field('AI','Depreciation Amount','قسط الاستهلاك السنوي الثابت','accounting','mandatory'),
  field('AJ','Accumulated Depreciation','الاستهلاك المتراكم','accounting','mandatory'),
  field('AK','Impairment Expense','مصروف الهبوط في القيمة','accounting','conditional'),
  field('AL','Accumulated Impairment','مجمع الهبوط في القيمة','accounting','conditional'),
  field('AM','Residual Value','القيمة المتبقية في نهاية العمر الإنتاجي','accounting','optional'),
  field('AN','Net Book Value','القيمة الدفترية','accounting','automatic'),
  field('AO','Useful Life (Year)','العمر الإنتاجي (سنة)','accounting','automatic'),
  field('AP','Remaining Useful Life (Year)','العمر المتبقي (سنة)','accounting','automatic'),
  field('AQ','Country','الدولة','location','mandatory'),
  field('AR','Region','المنطقة','location','mandatory'),
  field('AS','City','المدينة','location','mandatory'),
  field('AT','Geographical Coordinates','الإحداثيات','location','optional'),
  field('AU','National Address ID','العنوان الوطني','location','mandatory'),
  field('AV','Building Number','رقم المبنى','location','mandatory'),
  field('AW','Floors Number','رقم الدور','location','optional'),
  field('AX','Room/office Number','رقم الغرفة/ المكتب','location','optional'),
  field('AY','Disposal Date','تاريخ الاستبعاد','disposal','conditional'),
  field('AZ','Net Book Value as of the Disposal Date','صافي القيمة الدفترية في تاريخ الاستبعاد','disposal','conditional'),
  field('BA','Asset Disposal Value','قيمة استبعاد الأصل','disposal','conditional'),
  field('BB','Profit / Loss','الربح / الخسارة','disposal','conditional'),
];

export const MODEL_B_MANDATORY_COLUMNS = MODEL_B_FIELDS.filter((item) => item.classification === 'mandatory').map((item) => item.column);
export const MODEL_B_AUTOMATIC_COLUMNS = MODEL_B_FIELDS.filter((item) => item.classification === 'automatic').map((item) => item.column);
export const MODEL_B_CONDITIONAL_COLUMNS = MODEL_B_FIELDS.filter((item) => item.classification === 'conditional').map((item) => item.column);
export const MODEL_B_OPTIONAL_COLUMNS = MODEL_B_FIELDS.filter((item) => item.classification === 'optional').map((item) => item.column);

export const MODEL_B_SECTIONS: Array<{ key: ModelBSection; label: string; columns: string }> = [
  { key: 'entity', label: 'بيانات الجهة', columns: 'A:B' },
  { key: 'sustainability', label: 'إجراءات الاستدامة', columns: 'C' },
  { key: 'classification', label: 'بيانات تصنيف الأصل', columns: 'D:T' },
  { key: 'identity', label: 'البيانات التعريفية للأصل', columns: 'U:AE' },
  { key: 'accounting', label: 'البيانات المحاسبية', columns: 'AF:AP' },
  { key: 'location', label: 'الموقع الجغرافي', columns: 'AQ:AX' },
  { key: 'disposal', label: 'استبعاد الأصول', columns: 'AY:BB' },
];

const text = (value: unknown) => value === null || value === undefined ? '' : String(value).trim();
const numeric = (value: unknown) => {
  if (value === null || value === undefined || value === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

export const modelBPayloadOf = (asset: Pick<AssetRecord | AssetInput, 'excelPayload'>) => {
  const payload = (asset.excelPayload || {}) as Record<string, unknown>;
  const modelB = payload.modelB;
  return modelB && typeof modelB === 'object' && !Array.isArray(modelB)
    ? modelB as Record<string, unknown>
    : {};
};

export const setModelBPayload = (asset: AssetInput, patch: Record<string, unknown>): AssetInput => {
  const root = (asset.excelPayload || {}) as Record<string, unknown>;
  return {
    ...asset,
    excelPayload: {
      ...root,
      modelBVersion: MODEL_B_VERSION,
      modelBIssueDate: MODEL_B_ISSUE_DATE,
      modelB: { ...modelBPayloadOf(asset), ...patch },
    },
  };
};

export const calculateModelBDerived = (payload: Record<string, unknown>) => {
  const output = { ...payload };
  const cost = numeric(output.AH);
  const residual = numeric(output.AM) ?? 0;
  const usefulLife = numeric(output.AO);
  const remainingLife = numeric(output.AP);
  const accumulatedImpairment = numeric(output.AL) ?? 0;
  const method = text(output.AG);

  if (method === 'التكلفة التاريخية' && cost !== null && usefulLife && usefulLife > 0) {
    const depreciable = Math.max(0, cost - residual);
    const annual = depreciable / usefulLife;
    output.AI = Math.round((annual + Number.EPSILON) * 100) / 100;
    if (remainingLife !== null) {
      const usedLife = Math.max(0, Math.min(usefulLife, usefulLife - remainingLife));
      output.AJ = Math.round((Math.min(depreciable, annual * usedLife) + Number.EPSILON) * 100) / 100;
    }
  }

  const accumulatedDepreciation = numeric(output.AJ) ?? 0;
  if (cost !== null) output.AN = Math.round((cost - accumulatedDepreciation - accumulatedImpairment + Number.EPSILON) * 100) / 100;

  const disposalValue = numeric(output.BA);
  const disposalBookValue = numeric(output.AZ);
  if (disposalValue !== null && disposalBookValue !== null) {
    output.BB = Math.round((disposalValue - disposalBookValue + Number.EPSILON) * 100) / 100;
  }
  return output;
};

export const modelBValuesFromAsset = (asset: AssetRecord | AssetInput): Record<string, unknown> => {
  const extra = calculateModelBDerived(modelBPayloadOf(asset));
  return {
    A: asset.entityName || extra.A || '',
    B: asset.entityCode || extra.B || '',
    C: extra.C || '',
    D: extra.D || '', E: asset.classification1 || extra.E || '', F: extra.F || '',
    G: extra.G || '', H: asset.classification2 || extra.H || '', I: extra.I || '',
    J: extra.J || '', K: asset.classification3 || extra.K || '', L: extra.L || '',
    M: asset.accountingGroupCode || extra.M || '', N: asset.accountingGroup || extra.N || '', O: extra.O || '',
    P: asset.assetCode || extra.P || '', Q: extra.Q || '', R: extra.R || '', S: extra.S || '', T: extra.T || '',
    U: extra.U || asset.entityName || '', V: asset.responsibleDepartment || asset.department || extra.V || '', W: extra.W || '', X: extra.X || '',
    Y: extra.Y || '', Z: extra.Z || asset.itemNumber || ('assetNumber' in asset ? asset.assetNumber : '') || '',
    AA: asset.assetDescription || asset.name || extra.AA || '', AB: asset.cardNumber || asset.barcode || extra.AB || '',
    AC: asset.unitOfMeasure || extra.AC || '', AD: asset.quantity ?? extra.AD ?? '', AE: asset.manufacturer || asset.brand || extra.AE || '',
    AF: asset.serviceDate || extra.AF || '', AG: extra.AG || '', AH: asset.acquisitionCost ?? asset.purchaseValue ?? extra.AH ?? '',
    AI: extra.AI ?? '', AJ: extra.AJ ?? '', AK: extra.AK ?? '', AL: extra.AL ?? '', AM: extra.AM ?? '', AN: extra.AN ?? '',
    AO: asset.usefulLife ?? extra.AO ?? '', AP: asset.remainingLife ?? extra.AP ?? '', AQ: extra.AQ || 'المملكة العربية السعودية',
    AR: asset.region || extra.AR || '', AS: asset.city || extra.AS || '', AT: asset.coordinates || extra.AT || '', AU: extra.AU || '',
    AV: asset.buildingNumber || asset.building || extra.AV || '', AW: asset.floor || extra.AW || '', AX: asset.room || extra.AX || '',
    AY: extra.AY || '', AZ: extra.AZ ?? '', BA: extra.BA ?? '', BB: extra.BB ?? '',
  };
};

export const validateModelBValues = (values: Record<string, unknown>) => {
  const missingMandatory = MODEL_B_FIELDS
    .filter((field) => field.classification === 'mandatory' && !text(values[field.column]))
    .map((field) => ({ column: field.column, label: field.arabic }));
  const procedure = text(values.C);
  const conditionalMissing: Array<{ column: string; label: string }> = [];
  if (procedure === 'بيع' || procedure === 'إتلاف') {
    for (const column of ['AY', 'AZ', 'BA', 'BB']) {
      if (!text(values[column])) {
        const definition = MODEL_B_FIELDS.find((field) => field.column === column);
        if (definition) conditionalMissing.push({ column, label: definition.arabic });
      }
    }
  }
  return {
    missingMandatory,
    conditionalMissing,
    complete: missingMandatory.length === 0 && conditionalMissing.length === 0,
    completion: Math.round(((MODEL_B_MANDATORY_COLUMNS.length - missingMandatory.length) / MODEL_B_MANDATORY_COLUMNS.length) * 100),
  };
};
