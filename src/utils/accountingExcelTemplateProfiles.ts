import * as XLSX from 'xlsx';
import { ACCOUNTING_FIELDS, type AccountingRecordType } from '../app/config/accountingTransformationFields';
import { MODEL_B_FIELDS, MODEL_B_SHEET_NAME, MODEL_B_VERSION } from '../app/config/fixedAssetModelB';
import { sheetToResolvedMatrix } from './excelWorkbookValues';

export type AccountingExcelSheetRole =
  | 'data-land'
  | 'data-building'
  | 'data-fixed-asset'
  | 'reference'
  | 'lookup'
  | 'instructions'
  | 'report'
  | 'unknown';

export type AccountingExcelTemplateProfileId =
  | 'mof-model-b-compatible'
  | 'iau-land-building-compatible'
  | 'legacy-partial-compatible'
  | 'unknown';

export type AccountingExcelSheetProfile = {
  sheetName: string;
  role: AccountingExcelSheetRole;
  recordType?: AccountingRecordType;
  confidence: number;
  matchedFields: number;
  matchedBy: 'registered-name' | 'structure' | 'name-hint' | 'reference-rule' | 'unknown';
  reason: string;
};

export type AccountingExcelTemplateDetection = {
  profileId: AccountingExcelTemplateProfileId;
  profileName: string;
  version: string | null;
  confidence: number;
  safeForAutomaticImport: boolean;
  requiresConfirmation: boolean;
  matchedBy: 'registered-profile' | 'structure' | 'partial-structure' | 'unknown';
  sheets: AccountingExcelSheetProfile[];
  dataSheetCount: number;
  referenceSheetCount: number;
  unknownSheetCount: number;
};

const HEADER_SCAN_ROWS = 18;
const LEGACY_DATA_MATCH_THRESHOLD = 6;
const MODEL_B_DATA_MATCH_THRESHOLD = 8;

const normalize = (value: unknown) => String(value ?? '')
  .trim()
  .toLowerCase()
  .replace(/[ـ]/g, '')
  .replace(/[\u064B-\u065F\u0670]/g, '')
  .replace(/[أإآ]/g, 'ا')
  .replace(/ى/g, 'ي')
  .replace(/ة/g, 'ه')
  .replace(/[“”"'`]/g, '')
  .replace(/[^\p{L}\p{N}]+/gu, ' ')
  .replace(/\s+/g, ' ')
  .trim();

const LAND_REGISTERED_NAMES = [
  'أ - الأراضي - Land',
  'أ- الأراضي - Land',
  'الأراضي - Land',
  'Land - الأراضي',
].map(normalize);

const BUILDING_REGISTERED_NAMES = [
  'ب- Building - المباني',
  'ب - Building - المباني',
  'Building - المباني',
  'المباني - Building',
].map(normalize);

const MODEL_B_REGISTERED_NAMES = [
  MODEL_B_SHEET_NAME,
  'سجل الأصول',
  'سجل الاصول',
  'سجل الأصول الثابتة',
  'Fixed Assets Register',
].map(normalize);

const normalizeLabels = (values: unknown[]) => Array.from(new Set(values.map(normalize).filter((value) => value.length >= 4)));
const LAND_LABELS = normalizeLabels(ACCOUNTING_FIELDS.land.map((field) => field.a));
const BUILDING_LABELS = normalizeLabels(ACCOUNTING_FIELDS.building.map((field) => field.a));
const MODEL_B_LABELS = normalizeLabels(MODEL_B_FIELDS.flatMap((field) => [field.arabic, field.english]));
const MODEL_B_DISTINCTIVE_LABELS = normalizeLabels(
  MODEL_B_FIELDS
    .filter((field) => ['C', 'AC', 'AD', 'AE', 'AY', 'AZ', 'BA', 'BB'].includes(field.column))
    .flatMap((field) => [field.arabic, field.english]),
);

const matrixValues = (workbook: XLSX.WorkBook, sheetName: string) =>
  sheetToResolvedMatrix(workbook, sheetName, HEADER_SCAN_ROWS).flat().map(normalize).filter(Boolean);

const countLabelMatches = (values: string[], labels: string[]) => {
  let matches = 0;
  for (const label of labels) {
    if (values.some((value) => value === label || (label.length >= 8 && (value.includes(label) || label.includes(value))))) matches += 1;
  }
  return matches;
};

const roleFromReferenceName = (sheetName: string): AccountingExcelSheetRole | null => {
  const name = normalize(sheetName);
  if (name.includes('تعريفات') || name.includes('definitions') || name.includes('validation sheet')) return 'instructions';
  if (/^(l1|l2|l3|l5|l5vl|l3vl|ag|agvl|codevl|aren vl)$/i.test(String(sheetName).trim())) return 'lookup';
  if (name === 'lists' || name.includes('قوائم')) return 'lookup';
  if (
    name.includes('تصنيف') || name.includes('ترميز') || name.includes('classification') ||
    name.includes('classes and codes') || name.includes('اعمار') || name.includes('العمر الانتاجي') ||
    name.includes('threshold') || name.includes('رسمله') || name.includes('capitalization') ||
    name.includes('ربط تصنيفات')
  ) return 'reference';
  if (name.includes('تقرير') || name.includes('report')) return 'report';
  return null;
};

const knownNameRole = (sheetName: string): AccountingExcelSheetRole | null => {
  const name = normalize(sheetName);
  if (MODEL_B_REGISTERED_NAMES.some((candidate) => name === candidate || (candidate.length >= 6 && name.includes(candidate)))) return 'data-fixed-asset';
  if (LAND_REGISTERED_NAMES.includes(name)) return 'data-land';
  if (BUILDING_REGISTERED_NAMES.includes(name)) return 'data-building';
  return roleFromReferenceName(sheetName);
};

const inspectSheet = (workbook: XLSX.WorkBook, sheetName: string): AccountingExcelSheetProfile => {
  const values = matrixValues(workbook, sheetName);
  const name = normalize(sheetName);
  const registeredRole = knownNameRole(sheetName);

  const modelBMatches = countLabelMatches(values, MODEL_B_LABELS);
  const modelBDistinctiveMatches = countLabelMatches(values, MODEL_B_DISTINCTIVE_LABELS);
  const landMatches = countLabelMatches(values, LAND_LABELS);
  const buildingMatches = countLabelMatches(values, BUILDING_LABELS);

  if (registeredRole === 'data-fixed-asset') {
    const confidence = Math.min(100, 70 + Math.min(30, modelBMatches * 2 + modelBDistinctiveMatches * 4));
    return { sheetName, role: registeredRole, recordType: 'fixed_asset', confidence, matchedFields: modelBMatches, matchedBy: 'registered-name', reason: 'اسم الورقة مسجل لنموذج ب، وتم دعم القرار ببنية الحقول.' };
  }
  if (registeredRole === 'data-land') {
    const confidence = Math.min(100, 76 + Math.min(24, landMatches * 2));
    return { sheetName, role: registeredRole, recordType: 'land', confidence, matchedFields: landMatches, matchedBy: 'registered-name', reason: 'اسم الورقة مسجل كورقة بيانات الأراضي.' };
  }
  if (registeredRole === 'data-building') {
    const confidence = Math.min(100, 76 + Math.min(24, buildingMatches * 2));
    return { sheetName, role: registeredRole, recordType: 'building', confidence, matchedFields: buildingMatches, matchedBy: 'registered-name', reason: 'اسم الورقة مسجل كورقة بيانات المباني.' };
  }
  if (registeredRole) {
    return { sheetName, role: registeredRole, confidence: 100, matchedFields: 0, matchedBy: 'reference-rule', reason: 'اسم الورقة يدل على أنها مرجع/قائمة/تعليمات وليست سجلات أصول.' };
  }

  const modelBNameHint = name.includes('سجل الاصول') || name.includes('fixed asset');
  if (
    modelBMatches >= MODEL_B_DATA_MATCH_THRESHOLD &&
    (modelBDistinctiveMatches >= 2 || modelBNameHint) &&
    modelBMatches >= Math.max(landMatches, buildingMatches) + 2
  ) {
    const confidence = Math.min(99, 55 + modelBMatches * 2 + modelBDistinctiveMatches * 6 + (modelBNameHint ? 8 : 0));
    return { sheetName, role: 'data-fixed-asset', recordType: 'fixed_asset', confidence, matchedFields: modelBMatches, matchedBy: 'structure', reason: 'بنية العناوين تطابق نموذج ب حتى مع اختلاف اسم الورقة.' };
  }

  const bestLegacyType: 'land' | 'building' = buildingMatches > landMatches ? 'building' : 'land';
  const bestLegacyMatches = Math.max(landMatches, buildingMatches);
  const otherLegacyMatches = Math.min(landMatches, buildingMatches);
  const legacyNameHint = bestLegacyType === 'building'
    ? name.includes('building') || name.includes('مباني')
    : name.includes('land') || name.includes('اراضي') || name.includes('ارض');

  if (bestLegacyMatches >= LEGACY_DATA_MATCH_THRESHOLD && (bestLegacyMatches >= otherLegacyMatches + 1 || legacyNameHint)) {
    const confidence = Math.min(96, 50 + bestLegacyMatches * 4 + (legacyNameHint ? 10 : 0));
    return {
      sheetName,
      role: bestLegacyType === 'building' ? 'data-building' : 'data-land',
      recordType: bestLegacyType,
      confidence,
      matchedFields: bestLegacyMatches,
      matchedBy: legacyNameHint ? 'name-hint' : 'structure',
      reason: `بنية الحقول تطابق سجل ${bestLegacyType === 'building' ? 'المباني' : 'الأراضي'} حتى مع اختلاف اسم الورقة.`,
    };
  }

  return { sheetName, role: 'unknown', confidence: 0, matchedFields: Math.max(modelBMatches, landMatches, buildingMatches), matchedBy: 'unknown', reason: 'لم تتوفر أدلة كافية لتحويل هذه الورقة إلى سجلات، لذلك ستبقى مستبعدة من الاستيراد.' };
};

export const detectAccountingExcelTemplateProfile = (workbook: XLSX.WorkBook): AccountingExcelTemplateDetection => {
  const sheets = workbook.SheetNames.map((sheetName) => inspectSheet(workbook, sheetName));
  const fixed = sheets.filter((sheet) => sheet.role === 'data-fixed-asset');
  const lands = sheets.filter((sheet) => sheet.role === 'data-land');
  const buildings = sheets.filter((sheet) => sheet.role === 'data-building');
  const dataSheets = [...fixed, ...lands, ...buildings];
  const referenceSheets = sheets.filter((sheet) => ['reference', 'lookup', 'instructions', 'report'].includes(sheet.role));
  const unknownSheets = sheets.filter((sheet) => sheet.role === 'unknown');

  const exactModelB = fixed.some((sheet) => sheet.matchedBy === 'registered-name');
  const exactLegacy = lands.some((sheet) => sheet.matchedBy === 'registered-name') && buildings.some((sheet) => sheet.matchedBy === 'registered-name');
  const minDataConfidence = dataSheets.length ? Math.min(...dataSheets.map((sheet) => sheet.confidence)) : 0;
  const avgDataConfidence = dataSheets.length
    ? Math.round(dataSheets.reduce((sum, sheet) => sum + sheet.confidence, 0) / dataSheets.length)
    : 0;

  let profileId: AccountingExcelTemplateProfileId = 'unknown';
  let profileName = 'قالب Excel غير مسجل';
  let version: string | null = null;
  let matchedBy: AccountingExcelTemplateDetection['matchedBy'] = 'unknown';
  let safeForAutomaticImport = false;

  if (fixed.length) {
    profileId = 'mof-model-b-compatible';
    profileName = 'سجل الأصول الثابتة — نموذج ب';
    version = MODEL_B_VERSION;
    matchedBy = exactModelB ? 'registered-profile' : 'structure';
    safeForAutomaticImport = minDataConfidence >= 80;
  } else if (lands.length && buildings.length) {
    profileId = 'iau-land-building-compatible';
    profileName = 'نموذج الحصر والتقييم — أراضٍ ومبانٍ';
    version = exactLegacy ? 'IAU-2026' : 'بنية متوافقة';
    matchedBy = exactLegacy ? 'registered-profile' : 'structure';
    safeForAutomaticImport = minDataConfidence >= 75;
  } else if (lands.length || buildings.length) {
    profileId = 'legacy-partial-compatible';
    profileName = lands.length ? 'ملف أراضٍ متوافق بنيويًا' : 'ملف مبانٍ متوافق بنيويًا';
    version = 'جزئي';
    matchedBy = 'partial-structure';
    safeForAutomaticImport = minDataConfidence >= 85;
  }

  const confidence = profileId === 'unknown' ? 0 : Math.min(100, Math.round(avgDataConfidence + Math.min(8, referenceSheets.length * 2)));
  return {
    profileId,
    profileName,
    version,
    confidence,
    safeForAutomaticImport,
    requiresConfirmation: !safeForAutomaticImport,
    matchedBy,
    sheets,
    dataSheetCount: dataSheets.length,
    referenceSheetCount: referenceSheets.length,
    unknownSheetCount: unknownSheets.length,
  };
};

export const accountingSheetRoleIsData = (role: AccountingExcelSheetRole) =>
  role === 'data-land' || role === 'data-building' || role === 'data-fixed-asset';
