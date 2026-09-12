import type { StructuralAccountingIntakeRow } from './accountingWorkbookStructuralIntake';

export type ConsultantDataQualitySeverity = 'error' | 'warning';

export type ConsultantDataQualityIssue = {
  severity: ConsultantDataQualitySeverity;
  code: string;
  message: string;
  recordType: StructuralAccountingIntakeRow['recordType'];
  sourceSheet: string;
  sourceRow: number;
  column: string;
  value?: unknown;
};

export type ConsultantDataQualityReview = {
  checkedBuildingRows: number;
  normalizedRows: number;
  normalizedCells: number;
  normalizedByColumn: Record<string, number>;
  errorCount: number;
  warningCount: number;
  issues: ConsultantDataQualityIssue[];
};

export type ConsultantDataQualityResult = {
  rows: StructuralAccountingIntakeRow[];
  review: ConsultantDataQualityReview;
};

const UNIVERSITY_ENTITY_CODE = '0029';
const YEAR_DAYS = 364;
const NUMBER_TOLERANCE = 0.02;

const NOT_AVAILABLE_COLUMNS = new Set([
  'E', 'F', 'AB', 'AF', 'AR', 'AS', 'AT', 'AU', 'AV', 'AX',
]);

const NUMERIC_OR_NOT_AVAILABLE_COLUMNS = new Set(['AB', 'AF', 'AT', 'AX']);
const DATE_OR_NOT_AVAILABLE_COLUMNS = new Set(['AR', 'AS']);

const unavailableMarkers = new Set([
  '-', '—', '–',
  'غير متوفر', 'غير متوفره', 'غير متوفرة', 'غير متاح', 'لا يوجد', 'لاتوجد',
  'n/a', 'na', 'not available',
]);

const zeroCostMarkers = new Set([
  'بدون مقابل', 'دون مقابل', 'بدون تكلفة', 'دون تكلفة', 'مجانا', 'مجاني', 'free of charge',
]);

const untaggedMarkers = new Set([
  'بدون بطاقة', 'لا يوجد بطاقة', 'لا توجد بطاقة', 'غير مبركد', 'غير مرمز',
  'بدون باركود', 'لا يوجد باركود', 'not tagged', 'asset not tagged',
]);

const normalizeArabicText = (value: unknown) => String(value ?? '')
  .trim()
  .replace(/\s+/g, ' ')
  .toLowerCase()
  .replace(/[ـ]/g, '')
  .replace(/[\u064B-\u065F\u0670]/g, '')
  .replace(/[أإآ]/g, 'ا')
  .replace(/ى/g, 'ي')
  .replace(/ة/g, 'ه');

const canonicalMarker = (value: unknown) => normalizeArabicText(value);

const isBlank = (value: unknown) => value === null || value === undefined || String(value).trim() === '';

const isUnavailableMarker = (value: unknown) => unavailableMarkers.has(canonicalMarker(value));

const toNumber = (value: unknown): number | null => {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  const raw = String(value ?? '').trim().replace(/,/g, '');
  if (!raw) return null;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : null;
};

const excelSerialToDate = (serial: number) => {
  if (!Number.isFinite(serial) || serial <= 0) return null;
  const excelEpoch = Date.UTC(1899, 11, 30);
  const date = new Date(excelEpoch + serial * 86400000);
  return Number.isNaN(date.getTime()) ? null : date;
};

const parseDate = (value: unknown): Date | null => {
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value;
  if (typeof value === 'number') return excelSerialToDate(value);
  const raw = String(value ?? '').trim();
  if (!raw || isUnavailableMarker(raw)) return null;

  if (/^\d+(?:\.\d+)?$/.test(raw)) {
    const serial = Number(raw);
    if (serial > 1000) return excelSerialToDate(serial);
  }

  const parts = raw.match(/^(\d{1,4})[\/-](\d{1,2})[\/-](\d{1,4})$/);
  if (parts) {
    const a = Number(parts[1]);
    const b = Number(parts[2]);
    const c = Number(parts[3]);
    const year = a > 1900 ? a : c;
    const month = b;
    const day = a > 1900 ? c : a;
    if (year >= 1900 && month >= 1 && month <= 12 && day >= 1 && day <= 31) {
      const date = new Date(Date.UTC(year, month - 1, day));
      if (date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day) return date;
    }
  }

  const parsed = new Date(raw);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const calculateRemainingLife = (usefulLife: unknown, serviceDate: unknown, inspectionDate: unknown) => {
  const usefulLifeYears = toNumber(usefulLife);
  const service = parseDate(serviceDate);
  const inspection = parseDate(inspectionDate);
  if (usefulLifeYears === null || !service || !inspection || inspection < service) return null;
  const elapsedDays = (inspection.getTime() - service.getTime()) / 86400000;
  return Math.max(0, Math.round((usefulLifeYears - elapsedDays / YEAR_DAYS) * 100) / 100);
};

const isCoordinateLike = (value: unknown) => {
  const raw = String(value ?? '').trim();
  if (!raw || isUnavailableMarker(raw)) return true;
  const numbers = raw.match(/[-+]?\d+(?:\.\d+)?/g)?.map(Number).filter(Number.isFinite) || [];
  return numbers.length >= 2;
};

const isStatusInsteadOfDocumentType = (value: unknown) => {
  const normalized = normalizeArabicText(value);
  if (!normalized) return false;
  const statusWords = ['جاري التخصيص', 'قيد التخصيص', 'قيد الاستكمال', 'جاري نقل الملكيه', 'نقل الملكيه قيد'];
  const documentWords = ['صك', 'قرار', 'اتفاقيه', 'عقد', 'اعاره', 'مذكره', 'محضر'];
  return statusWords.some((word) => normalized.includes(normalizeArabicText(word)))
    && !documentWords.some((word) => normalized.includes(normalizeArabicText(word)));
};

export const applyConsultantDataQualityRules = (
  sourceRows: StructuralAccountingIntakeRow[],
): ConsultantDataQualityResult => {
  const issues: ConsultantDataQualityIssue[] = [];
  const normalizedByColumn: Record<string, number> = {};
  let normalizedCells = 0;
  let normalizedRows = 0;
  let checkedBuildingRows = 0;

  const noteChange = (column: string) => {
    normalizedCells += 1;
    normalizedByColumn[column] = (normalizedByColumn[column] || 0) + 1;
  };

  const addIssue = (
    row: StructuralAccountingIntakeRow,
    severity: ConsultantDataQualitySeverity,
    column: string,
    code: string,
    message: string,
    value?: unknown,
  ) => issues.push({
    severity,
    code,
    message,
    recordType: row.recordType,
    sourceSheet: row.sourceSheet,
    sourceRow: row.sourceRow,
    column,
    value,
  });

  const rows = sourceRows.map((row) => {
    if (row.recordType !== 'building') return row;
    checkedBuildingRows += 1;

    const payload = { ...row.payload };
    let rowChanged = false;

    const setValue = (column: string, value: unknown) => {
      if (payload[column] === value) return;
      payload[column] = value;
      rowChanged = true;
      noteChange(column);
    };

    for (const column of NOT_AVAILABLE_COLUMNS) {
      const value = payload[column];
      if (!isBlank(value) && isUnavailableMarker(value) && String(value).trim() !== 'Not Available') {
        setValue(column, 'Not Available');
      }
    }

    if (!isBlank(payload.C) && String(payload.C).trim() !== UNIVERSITY_ENTITY_CODE) {
      setValue('C', UNIVERSITY_ENTITY_CODE);
    }

    if (!isBlank(payload.X) && zeroCostMarkers.has(canonicalMarker(payload.X))) {
      setValue('X', 0);
    }

    if (!isBlank(payload.BC) && untaggedMarkers.has(canonicalMarker(payload.BC))) {
      setValue('BC', 'Asset not tagged');
    }

    for (const column of NUMERIC_OR_NOT_AVAILABLE_COLUMNS) {
      const value = payload[column];
      if (isBlank(value) || String(value).trim() === 'Not Available') continue;
      if (toNumber(value) === null) {
        addIssue(
          row,
          'error',
          column,
          'numeric-or-na',
          `القيمة في العمود ${column} يجب أن تكون رقمية أو Not Available دون نص وصفي.`,
          value,
        );
      }
    }

    for (const column of DATE_OR_NOT_AVAILABLE_COLUMNS) {
      const value = payload[column];
      if (isBlank(value) || String(value).trim() === 'Not Available') continue;
      if (!parseDate(value)) {
        addIssue(
          row,
          'error',
          column,
          'date-or-na',
          `القيمة في العمود ${column} يجب أن تكون تاريخًا صالحًا أو Not Available.`,
          value,
        );
      }
    }

    if (!isBlank(payload.AP) && String(payload.AP).trim() !== 'Not Available' && !isCoordinateLike(payload.AP)) {
      addIssue(
        row,
        'error',
        'AP',
        'invalid-coordinates',
        'الإحداثيات في العمود AP لا تحتوي على زوج إحداثيات واضح.',
        payload.AP,
      );
    }

    if (!isBlank(payload.AY) && canonicalMarker(payload.AY) !== 'inspection not performed' && !parseDate(payload.AY)) {
      addIssue(
        row,
        'error',
        'AY',
        'invalid-inspection-date',
        'تاريخ التحقق الميداني في AY يجب أن يكون تاريخًا صالحًا أو Inspection not performed.',
        payload.AY,
      );
    }

    if (!isBlank(payload.BB)) {
      const remaining = toNumber(payload.BB);
      if (remaining === null) {
        addIssue(row, 'error', 'BB', 'invalid-remaining-life', 'العمر المتبقي في BB يجب أن يكون رقمًا بالسنوات.', payload.BB);
      } else if (remaining < 0) {
        addIssue(row, 'error', 'BB', 'negative-remaining-life', 'العمر المتبقي في BB لا يمكن أن يكون سالبًا.', payload.BB);
      }
    }

    const calculatedRemaining = calculateRemainingLife(payload.U, payload.AR, payload.AY);
    if (calculatedRemaining !== null) {
      const currentRemaining = toNumber(payload.BB);
      if (currentRemaining === null || Math.abs(currentRemaining - calculatedRemaining) > NUMBER_TOLERANCE) {
        setValue('BB', calculatedRemaining);
      }
    }

    if (isStatusInsteadOfDocumentType(payload.AU)) {
      addIssue(
        row,
        'warning',
        'AU',
        'document-status-in-type-field',
        'العمود AU مخصص لنوع الوثيقة؛ حالة التخصيص أو نقل الملكية يجب أن ترتبط بوثيقة محددة أو تسجل في الملاحظات/حالة الإجراء.',
        payload.AU,
      );
    }

    if (canonicalMarker(payload.W) === 'اتفاقيه') {
      addIssue(
        row,
        'warning',
        'W',
        'lease-duration-is-document-type',
        'العمود W مخصص لمدة الانتفاع/الإيجار، بينما القيمة «اتفاقية» تصف نوع المستند ولا تحدد المدة.',
        payload.W,
      );
    }

    if (!isBlank(payload.AC) && isUnavailableMarker(payload.AC)) {
      addIssue(
        row,
        'warning',
        'AC',
        'maintenance-link-unavailable',
        'الترميز الموحد مع الصيانة في AC غير متوفر ويحتاج مرجعًا معتمدًا قبل تعبئته؛ لم يتم افتراض قيمة.',
        payload.AC,
      );
    }

    if (rowChanged) normalizedRows += 1;
    return rowChanged ? { ...row, payload } : row;
  });

  const errorCount = issues.filter((issue) => issue.severity === 'error').length;
  const warningCount = issues.length - errorCount;

  return {
    rows,
    review: {
      checkedBuildingRows,
      normalizedRows,
      normalizedCells,
      normalizedByColumn,
      errorCount,
      warningCount,
      issues,
    },
  };
};

export const consultantReviewMessage = (review: ConsultantDataQualityReview) => {
  if (!review.checkedBuildingRows) return 'لم يتم العثور على سجلات مبانٍ لتطبيق قواعد ملاحظات الاستشاري.';
  const normalized = review.normalizedCells
    ? ` تم توحيد ${review.normalizedCells.toLocaleString('ar-SA')} خلية آليًا دون افتراض بيانات غير موثقة.`
    : '';
  return `فحص ملاحظات الاستشاري: ${review.checkedBuildingRows.toLocaleString('ar-SA')} سجل مبنى، ${review.errorCount.toLocaleString('ar-SA')} خطأ مانع، ${review.warningCount.toLocaleString('ar-SA')} تنبيه.${normalized}`;
};
