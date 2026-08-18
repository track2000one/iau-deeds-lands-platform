import * as XLSX from 'xlsx';
import type {
  AccountingAssetClassificationImportInput,
  AccountingAssetClassificationImportRow,
  AccountingAssetUsefulLifeImportRow,
} from '../app/api/accountingAssetClassification';

const CLASSIFICATION_SHEET = 'تصنيف وترميز الاصول';
const USEFUL_LIFE_SHEET = 'الاعمار الانتاجية وحدود الرسملة';

const H = {
  level1Code: 'رمز تصنيف الأصول المستوى الأول',
  level1Ar: 'وصف تصنيف الأصول المستوى الأول - عربي',
  level1En: 'وصف تصنيف الأصول المستوى الأول - انجليزي',
  level2Code: 'رمز تصنيف الأصول المستوى الثاني',
  level2Ar: 'وصف تصنيف الأصول المستوى الثاني - عربي',
  level2En: 'وصف تصنيف الأصول المستوى الثاني - انجليزي',
  level3Code: 'رمز تصنيف الأصول المستوى الثالث',
  level3Ar: 'وصف تصنيف الأصول المستوى الثالث - عربي',
  level3En: 'وصف تصنيف الأصول المستوى الثالث - انجليزي',
  groupCode: 'رمز المجموعة المحاسبية',
  groupAr: 'وصف المجموعة المحاسبية - عربي',
  groupEn: 'وصف المجموعة المحاسبية - انجليزي',
  accountingAssetCode: 'رمز الأصل للغرض المحاسبي',
  assetCostAccountCode: 'رمز حساب تكلفة الأصل',
  assetCostAccountName: 'حساب تكلفة الأصل',
  clearingAccountCode: 'رمز الحساب الوسيط',
  clearingAccountName: 'الحساب الوسيط',
  status: 'New/Old',
  capitalizationLimit: 'حدود الرسملة',
  minLife: 'الحد الأدنى لعمر الإنتاجي',
  maxLife: 'الحد الأعلى للعمر الإنتاجي',
  defaultLife: 'العمر الافتراضي',
} as const;

const text = (value: unknown) => String(value ?? '').trim();
const nullableText = (value: unknown) => text(value) || null;
const numberOrNull = (value: unknown) => {
  const raw = text(value).replace(/,/g, '');
  if (!raw || /^n\/?a$/i.test(raw) || raw === '-') return null;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : null;
};

const findSheet = (workbook: XLSX.WorkBook, exactName: string, tokens: string[]) => {
  const exact = workbook.SheetNames.find((name) => name.trim() === exactName);
  if (exact) return exact;
  const normalizedTokens = tokens.map((token) => token.replace(/\s+/g, ''));
  return workbook.SheetNames.find((name) => {
    const normalized = name.replace(/\s+/g, '');
    return normalizedTokens.every((token) => normalized.includes(token));
  });
};

const validateHeaders = (rows: Record<string, unknown>[], required: string[], sheetLabel: string) => {
  const first = rows[0];
  if (!first) throw new Error(`ورقة «${sheetLabel}» لا تحتوي على بيانات.`);
  const missing = required.filter((header) => !(header in first));
  if (missing.length) throw new Error(`تعذر قراءة الأعمدة المطلوبة في ورقة «${sheetLabel}»: ${missing.join('، ')}`);
};

const inferVersionLabel = (fileName: string) => {
  const withoutExtension = fileName.replace(/\.(xlsx|xlsm|xls)$/i, '').trim();
  const match = withoutExtension.match(/النسخة\s+([^\s_-]+(?:\s+[^\s_-]+)?)/i);
  return match?.[0]?.trim() || 'النسخة الحالية';
};

export type ParsedAccountingAssetClassificationWorkbook = AccountingAssetClassificationImportInput & {
  summary: {
    level1Count: number;
    level2Count: number;
    level3Count: number;
    accountingGroupCount: number;
    newClassificationCount: number;
    oldClassificationCount: number;
    newUsefulLifeCount: number;
    oldUsefulLifeCount: number;
  };
};

export const parseAccountingAssetClassificationWorkbook = async (
  file: File
): Promise<ParsedAccountingAssetClassificationWorkbook> => {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: 'array', cellDates: false });

  const classificationSheetName = findSheet(workbook, CLASSIFICATION_SHEET, ['تصنيف', 'ترميز', 'الاصول']);
  const usefulLifeSheetName = findSheet(workbook, USEFUL_LIFE_SHEET, ['الاعمار', 'الانتاجية', 'الرسملة']);
  if (!classificationSheetName) throw new Error('لم يتم العثور على ورقة «تصنيف وترميز الاصول» في الملف.');
  if (!usefulLifeSheetName) throw new Error('لم يتم العثور على ورقة «الاعمار الانتاجية وحدود الرسملة» في الملف.');

  const classificationRaw = XLSX.utils.sheet_to_json<Record<string, unknown>>(
    workbook.Sheets[classificationSheetName],
    { defval: '', raw: false }
  );
  const usefulLifeRaw = XLSX.utils.sheet_to_json<Record<string, unknown>>(
    workbook.Sheets[usefulLifeSheetName],
    { defval: '', raw: false }
  );

  validateHeaders(classificationRaw, [
    H.level1Code, H.level1Ar, H.level2Code, H.level2Ar, H.level3Code, H.level3Ar,
    H.groupCode, H.groupAr, H.accountingAssetCode, H.assetCostAccountCode,
    H.assetCostAccountName, H.clearingAccountCode, H.clearingAccountName, H.status,
  ], classificationSheetName);
  validateHeaders(usefulLifeRaw, [
    H.level1Ar, H.level2Ar, H.level3Ar, H.capitalizationLimit,
    H.minLife, H.maxLife, H.defaultLife, H.status,
  ], usefulLifeSheetName);

  const classifications: AccountingAssetClassificationImportRow[] = classificationRaw
    .map((row, index) => ({
      level1Code: text(row[H.level1Code]),
      level1Ar: text(row[H.level1Ar]),
      level1En: nullableText(row[H.level1En]),
      level2Code: text(row[H.level2Code]),
      level2Ar: text(row[H.level2Ar]),
      level2En: nullableText(row[H.level2En]),
      level3Code: text(row[H.level3Code]),
      level3Ar: text(row[H.level3Ar]),
      level3En: nullableText(row[H.level3En]),
      accountingGroupCode: text(row[H.groupCode]),
      accountingGroupAr: text(row[H.groupAr]),
      accountingGroupEn: nullableText(row[H.groupEn]),
      accountingAssetCode: text(row[H.accountingAssetCode]),
      assetCostAccountCode: nullableText(row[H.assetCostAccountCode]),
      assetCostAccountName: nullableText(row[H.assetCostAccountName]),
      clearingAccountCode: nullableText(row[H.clearingAccountCode]),
      clearingAccountName: nullableText(row[H.clearingAccountName]),
      lifecycleStatus: nullableText(row[H.status]),
      sourceRow: index + 2,
    }))
    .filter((row) => row.level1Code && row.level1Ar && row.level2Code && row.level2Ar && row.level3Code && row.level3Ar && row.accountingGroupCode && row.accountingGroupAr && row.accountingAssetCode);

  const usefulLives: AccountingAssetUsefulLifeImportRow[] = usefulLifeRaw
    .map((row, index) => ({
      level1Ar: text(row[H.level1Ar]),
      level1En: nullableText(row[H.level1En]),
      level2Ar: text(row[H.level2Ar]),
      level2En: nullableText(row[H.level2En]),
      level3Ar: text(row[H.level3Ar]),
      level3En: nullableText(row[H.level3En]),
      capitalizationLimit: numberOrNull(row[H.capitalizationLimit]),
      capitalizationLimitRaw: nullableText(row[H.capitalizationLimit]),
      minimumUsefulLife: numberOrNull(row[H.minLife]),
      maximumUsefulLife: numberOrNull(row[H.maxLife]),
      defaultUsefulLife: numberOrNull(row[H.defaultLife]),
      lifecycleStatus: nullableText(row[H.status]),
      sourceRow: index + 2,
    }))
    .filter((row) => row.level1Ar && row.level2Ar && row.level3Ar);

  if (!classifications.length) throw new Error('لم يتم استخراج أي سجل صالح من ورقة تصنيف وترميز الأصول.');

  const level1 = new Set(classifications.map((row) => `${row.level1Code}|${row.level1Ar}`));
  const level2 = new Set(classifications.map((row) => `${row.level1Code}|${row.level2Code}|${row.level2Ar}`));
  const level3 = new Set(classifications.map((row) => `${row.level1Code}|${row.level2Code}|${row.level3Code}|${row.level3Ar}`));
  const groups = new Set(classifications.map((row) => `${row.accountingGroupCode}|${row.accountingGroupAr}`));
  const isNew = (status?: string | null) => /new/i.test(String(status || ''));
  const isOld = (status?: string | null) => /old/i.test(String(status || ''));

  return {
    versionLabel: inferVersionLabel(file.name),
    title: 'دليل تصنيف وترميز الأصول',
    sourceFileName: file.name,
    notes: 'بيانات مرجعية معتمدة ضمن متطلبات لجنة متابعة متطلبات التحول المحاسبي.',
    classifications,
    usefulLives,
    summary: {
      level1Count: level1.size,
      level2Count: level2.size,
      level3Count: level3.size,
      accountingGroupCount: groups.size,
      newClassificationCount: classifications.filter((row) => isNew(row.lifecycleStatus)).length,
      oldClassificationCount: classifications.filter((row) => isOld(row.lifecycleStatus)).length,
      newUsefulLifeCount: usefulLives.filter((row) => isNew(row.lifecycleStatus)).length,
      oldUsefulLifeCount: usefulLives.filter((row) => isOld(row.lifecycleStatus)).length,
    },
  };
};
