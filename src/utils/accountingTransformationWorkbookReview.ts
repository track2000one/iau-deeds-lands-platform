import JSZip from 'jszip';
import * as XLSX from 'xlsx';
import {
  ACCOUNTING_FIELDS,
  excelColumnToIndex,
  type AccountingRecordType,
} from '../app/config/accountingTransformationFields';
import type {
  AccountingAssetClassificationRow,
  AccountingAssetUsefulLifeRow,
} from '../app/api/accountingAssetClassification';

export type AccountingClassificationReviewStatus = 'not_required' | 'matched' | 'corrected' | 'needs_review';
export type AccountingUsefulLifeReviewStatus = 'not_checked' | 'valid' | 'adjusted' | 'needs_review';

export type AccountingWorkbookReviewMeta = {
  classificationYellow?: boolean;
  classificationReviewStatus?: AccountingClassificationReviewStatus;
  classificationChangedFields?: string[];
  classificationReferenceCode?: string | null;
  classificationReviewMessage?: string | null;
  usefulLifeReviewStatus?: AccountingUsefulLifeReviewStatus;
  usefulLifeReference?: string | null;
};

export type AccountingWorkbookReviewItem = AccountingWorkbookReviewMeta & {
  recordType: AccountingRecordType;
  sourceRow: number;
  payload: Record<string, unknown>;
};

export type AccountingWorkbookReviewSummary = {
  yellow: number;
  matched: number;
  corrected: number;
  unresolved: number;
  usefulLifeAdjusted: number;
  usefulLifeNeedsReview: number;
};

const CLASSIFICATION_COLUMNS = ['H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T'] as const;

const normalizeSheetName = (value: string) => value
  .toLowerCase()
  .replace(/[ـ]/g, '')
  .replace(/[\u064B-\u065F\u0670]/g, '')
  .replace(/\s+/g, ' ')
  .trim();

const normalizeArabicText = (value: unknown) => String(value ?? '')
  .trim()
  .replace(/\s+/g, ' ')
  .toLowerCase()
  .replace(/[ـ]/g, '')
  .replace(/[\u064B-\u065F\u0670]/g, '')
  .replace(/[أإآ]/g, 'ا')
  .replace(/ى/g, 'ي')
  .replace(/ة/g, 'ه')
  .replace(/[“”"'`]/g, '')
  .replace(/[^\p{L}\p{N}]+/gu, ' ')
  .trim();

const normalizeCode = (value: unknown, width?: number) => {
  const raw = String(value ?? '').trim().replace(/^'+/, '').replace(/\s+/g, '');
  if (!raw) return '';
  const numeric = raw.replace(/\.0+$/, '');
  if (/^\d+$/.test(numeric) && width) return numeric.padStart(width, '0');
  return numeric.toLowerCase();
};

const comparableText = (value: unknown) => normalizeArabicText(value);

const getSheetMatrix = (workbook: XLSX.WorkBook, sheetName: string) => XLSX.utils.sheet_to_json<unknown[]>(
  workbook.Sheets[sheetName],
  { header: 1, defval: '', raw: false }
);

const structuralScore = (workbook: XLSX.WorkBook, sheetName: string, type: AccountingRecordType) => {
  const rows = getSheetMatrix(workbook, sheetName).slice(0, 7);
  const flattened = rows.flat().map(normalizeArabicText).filter(Boolean);
  if (!flattened.length) return 0;

  const uValues = rows.map((row) => normalizeArabicText(row[excelColumnToIndex('U')])).filter(Boolean);
  const hasTypeMarker = type === 'building'
    ? uValues.some((value) => value.includes('العمر الانتاجي') || value.includes('useful life'))
    : uValues.some((value) => value.includes('مساحه الارض') || value.includes('land area'));
  if (!hasTypeMarker) return 0;

  const fieldLabels = ACCOUNTING_FIELDS[type].map((field) => normalizeArabicText(field.a)).filter(Boolean);
  let score = 20 + fieldLabels.reduce((count, field) => count + (flattened.some((cell) => cell === field || cell.includes(field)) ? 1 : 0), 0);
  if (type === 'building' && flattened.some((value) => value.includes('building') || value.includes('مباني') || value.includes('المباني'))) score += 2;
  if (type === 'land' && flattened.some((value) => value.includes('land') || value.includes('الاراضي') || value.includes('ارض'))) score += 2;
  return score;
};

export const findAccountingTemplateSheet = (workbook: XLSX.WorkBook, type: AccountingRecordType) => {
  const names = workbook.SheetNames;
  const byName = names.find((name) => {
    const normalized = normalizeSheetName(name);
    return type === 'land'
      ? normalized.includes('الأراضي') || normalized.includes('الاراضي') || normalized.includes('land')
      : normalized.includes('المباني') || normalized.includes('مباني') || normalized.includes('building');
  });
  if (byName) return byName;

  const scored = names
    .map((name) => ({ name, score: structuralScore(workbook, name, type) }))
    .filter((item) => item.score >= 20)
    .sort((a, b) => b.score - a.score);
  return scored[0]?.name;
};

const xmlDoc = (xml: string) => new DOMParser().parseFromString(xml, 'application/xml');
const directChildren = (node: Element, name: string) => Array.from(node.children).filter((child) => child.localName === name);
const firstDirectChild = (node: Element, name: string) => directChildren(node, name)[0] || null;

const normalizeZipPath = (base: string, target: string) => {
  if (target.startsWith('/')) return target.replace(/^\/+/, '');
  const stack = base.split('/').filter(Boolean);
  stack.pop();
  for (const part of target.split('/')) {
    if (!part || part === '.') continue;
    if (part === '..') stack.pop();
    else stack.push(part);
  }
  return stack.join('/');
};

export const findExplicitYellowUsefulLifeRows = async (
  buffer: ArrayBuffer,
  sheetName: string,
  workbook?: XLSX.WorkBook,
): Promise<Set<number>> => {
  const yellowRows = new Set<number>();
  try {
    const zip = await JSZip.loadAsync(buffer);
    const workbookFile = zip.file('xl/workbook.xml');
    const relsFile = zip.file('xl/_rels/workbook.xml.rels');
    const stylesFile = zip.file('xl/styles.xml');
    if (!workbookFile || !relsFile || !stylesFile) throw new Error('not-xlsx');

    const [workbookXml, relsXml, stylesXml] = await Promise.all([
      workbookFile.async('text'),
      relsFile.async('text'),
      stylesFile.async('text'),
    ]);

    const workbookDoc = xmlDoc(workbookXml);
    const relsDoc = xmlDoc(relsXml);
    const stylesDoc = xmlDoc(stylesXml);
    const sheet = Array.from(workbookDoc.getElementsByTagNameNS('*', 'sheet'))
      .find((node) => node.getAttribute('name') === sheetName);
    const relId = sheet?.getAttributeNS('http://schemas.openxmlformats.org/officeDocument/2006/relationships', 'id')
      || sheet?.getAttribute('r:id');
    const relationship = Array.from(relsDoc.getElementsByTagNameNS('*', 'Relationship'))
      .find((node) => node.getAttribute('Id') === relId);
    const target = relationship?.getAttribute('Target');
    if (!target) throw new Error('sheet-target-not-found');
    const sheetPath = normalizeZipPath('xl/workbook.xml', target);
    const sheetFile = zip.file(sheetPath);
    if (!sheetFile) throw new Error('sheet-xml-not-found');

    const fillsNode = Array.from(stylesDoc.getElementsByTagNameNS('*', 'fills'))[0];
    const xfsNode = Array.from(stylesDoc.getElementsByTagNameNS('*', 'cellXfs'))[0];
    const fills = fillsNode ? directChildren(fillsNode, 'fill') : [];
    const xfs = xfsNode ? directChildren(xfsNode, 'xf') : [];
    const yellowFillIds = new Set<number>();
    fills.forEach((fill, index) => {
      const pattern = firstDirectChild(fill, 'patternFill');
      const fg = pattern ? firstDirectChild(pattern, 'fgColor') : null;
      const rgb = String(fg?.getAttribute('rgb') || '').toUpperCase();
      if (rgb === 'FFFF00' || rgb === 'FFFFFF00' || rgb.endsWith('FFFF00')) yellowFillIds.add(index);
    });
    const yellowStyleIds = new Set<number>();
    xfs.forEach((xf, index) => {
      const fillId = Number(xf.getAttribute('fillId') || 0);
      if (yellowFillIds.has(fillId)) yellowStyleIds.add(index);
    });

    const sheetDoc = xmlDoc(await sheetFile.async('text'));
    for (const cell of Array.from(sheetDoc.getElementsByTagNameNS('*', 'c'))) {
      const reference = String(cell.getAttribute('r') || '').toUpperCase();
      const match = reference.match(/^U(\d+)$/);
      if (!match) continue;
      const styleId = Number(cell.getAttribute('s') || 0);
      if (yellowStyleIds.has(styleId)) yellowRows.add(Number(match[1]));
    }
    return yellowRows;
  } catch {
    const sheet = workbook?.Sheets[sheetName] as (XLSX.WorkSheet & Record<string, any>) | undefined;
    if (!sheet) return yellowRows;
    const range = XLSX.utils.decode_range(sheet['!ref'] || 'A1:A1');
    for (let row = range.s.r; row <= range.e.r; row += 1) {
      const address = `U${row + 1}`;
      const cell = sheet[address] as any;
      const rgb = String(cell?.s?.fill?.fgColor?.rgb || cell?.s?.fgColor?.rgb || '').toUpperCase();
      if (rgb === 'FFFF00' || rgb === 'FFFFFF00' || rgb.endsWith('FFFF00')) yellowRows.add(row + 1);
    }
    return yellowRows;
  }
};

const classificationPayload = (row: AccountingAssetClassificationRow): Record<(typeof CLASSIFICATION_COLUMNS)[number], string> => ({
  H: row.level1Ar || '',
  I: row.level1En || '',
  J: row.level1Code || '',
  K: row.level2Ar || '',
  L: row.level2En || '',
  M: row.level2Code || '',
  N: row.level3Ar || '',
  O: row.level3En || '',
  P: row.level3Code || '',
  Q: row.accountingGroupAr || '',
  R: row.accountingGroupEn || '',
  S: row.accountingGroupCode || '',
  T: row.accountingAssetCode || '',
});

const chooseCurrent = <T extends { lifecycleStatus?: string | null },>(items: T[]) => {
  const current = items.filter((item) => /new|جديد/i.test(String(item.lifecycleStatus || '')));
  if (current.length === 1) return current[0];
  return items.length === 1 ? items[0] : null;
};

const matchClassification = (
  payload: Record<string, unknown>,
  classifications: AccountingAssetClassificationRow[],
) => {
  const tCode = normalizeCode(payload.T, 8);
  if (tCode) {
    const byAssetCode = classifications.filter((row) => normalizeCode(row.accountingAssetCode, 8) === tCode);
    const exact = chooseCurrent(byAssetCode);
    if (exact) return exact;
  }

  const codeParts = [
    normalizeCode(payload.J, 2),
    normalizeCode(payload.M, 2),
    normalizeCode(payload.P, 2),
    normalizeCode(payload.S, 2),
  ];
  if (codeParts.every(Boolean)) {
    const byCodes = classifications.filter((row) =>
      normalizeCode(row.level1Code, 2) === codeParts[0]
      && normalizeCode(row.level2Code, 2) === codeParts[1]
      && normalizeCode(row.level3Code, 2) === codeParts[2]
      && normalizeCode(row.accountingGroupCode, 2) === codeParts[3]);
    const exact = chooseCurrent(byCodes);
    if (exact) return exact;
  }

  const textParts = [payload.H, payload.K, payload.N, payload.Q].map(normalizeArabicText);
  if (textParts.every(Boolean)) {
    const byHierarchy = classifications.filter((row) =>
      normalizeArabicText(row.level1Ar) === textParts[0]
      && normalizeArabicText(row.level2Ar) === textParts[1]
      && normalizeArabicText(row.level3Ar) === textParts[2]
      && normalizeArabicText(row.accountingGroupAr) === textParts[3]);
    const exact = chooseCurrent(byHierarchy);
    if (exact) return exact;
  }

  const hierarchyWithoutGroup = [payload.H, payload.K, payload.N].map(normalizeArabicText);
  if (hierarchyWithoutGroup.every(Boolean)) {
    const matches = classifications.filter((row) =>
      normalizeArabicText(row.level1Ar) === hierarchyWithoutGroup[0]
      && normalizeArabicText(row.level2Ar) === hierarchyWithoutGroup[1]
      && normalizeArabicText(row.level3Ar) === hierarchyWithoutGroup[2]);
    const exact = chooseCurrent(matches);
    if (exact) return exact;
  }
  return null;
};

const matchUsefulLife = (
  classification: AccountingAssetClassificationRow,
  usefulLives: AccountingAssetUsefulLifeRow[],
) => {
  const matches = usefulLives.filter((row) =>
    normalizeArabicText(row.level1Ar) === normalizeArabicText(classification.level1Ar)
    && normalizeArabicText(row.level2Ar) === normalizeArabicText(classification.level2Ar)
    && normalizeArabicText(row.level3Ar) === normalizeArabicText(classification.level3Ar));
  return chooseCurrent(matches);
};

const parseNumber = (value: unknown) => {
  const numeric = Number(String(value ?? '').replace(/,/g, '').trim());
  return Number.isFinite(numeric) ? numeric : null;
};

const reconcileUsefulLife = (
  payload: Record<string, unknown>,
  classification: AccountingAssetClassificationRow,
  usefulLives: AccountingAssetUsefulLifeRow[],
) => {
  const reference = matchUsefulLife(classification, usefulLives);
  if (!reference) {
    return { status: 'needs_review' as const, message: 'لم يتم العثور على سجل عمر إنتاجي مطابق في الدليل المرجعي.' };
  }
  const current = parseNumber(payload.U);
  const min = reference.minimumUsefulLife ?? null;
  const max = reference.maximumUsefulLife ?? null;
  const defaultLife = reference.defaultUsefulLife ?? null;
  const withinMin = min == null || (current != null && current >= min);
  const withinMax = max == null || (current != null && current <= max);
  const referenceText = [
    min != null ? `حد أدنى ${min}` : null,
    max != null ? `حد أعلى ${max}` : null,
    defaultLife != null ? `افتراضي ${defaultLife}` : null,
  ].filter(Boolean).join(' — ');

  if (current != null && withinMin && withinMax) {
    return { status: 'valid' as const, reference: referenceText || 'مطابق للدليل' };
  }
  const safeDefault = defaultLife ?? (min != null && max != null && min === max ? min : null);
  if (safeDefault != null) {
    payload.U = String(safeDefault);
    return { status: 'adjusted' as const, reference: referenceText || `القيمة المرجعية ${safeDefault}` };
  }
  return {
    status: 'needs_review' as const,
    reference: referenceText || null,
    message: 'العمر الإنتاجي خارج الحدود المرجعية أو غير مكتمل ولا توجد قيمة افتراضية آمنة للتطبيق التلقائي.',
  };
};

export const reconcileYellowBuildingClassifications = <T extends AccountingWorkbookReviewItem>(
  items: T[],
  yellowRows: Set<number>,
  classifications: AccountingAssetClassificationRow[],
  usefulLives: AccountingAssetUsefulLifeRow[],
): { items: T[]; summary: AccountingWorkbookReviewSummary } => {
  const summary: AccountingWorkbookReviewSummary = {
    yellow: 0,
    matched: 0,
    corrected: 0,
    unresolved: 0,
    usefulLifeAdjusted: 0,
    usefulLifeNeedsReview: 0,
  };

  const reviewed = items.map((item) => {
    if (item.recordType !== 'building' || !yellowRows.has(item.sourceRow)) {
      return {
        ...item,
        classificationYellow: false,
        classificationReviewStatus: 'not_required' as const,
        usefulLifeReviewStatus: 'not_checked' as const,
      };
    }

    summary.yellow += 1;
    const payload = { ...item.payload };
    const classification = matchClassification(payload, classifications);
    if (!classification) {
      summary.unresolved += 1;
      summary.usefulLifeNeedsReview += 1;
      return {
        ...item,
        payload,
        classificationYellow: true,
        classificationReviewStatus: 'needs_review' as const,
        classificationChangedFields: [],
        classificationReferenceCode: normalizeCode(payload.T, 8) || null,
        classificationReviewMessage: 'تعذر تحديد سجل واحد مؤكد من دليل التصنيف والترميز. لم يغيّر النظام H:T تلقائيًا.',
        usefulLifeReviewStatus: 'needs_review' as const,
        usefulLifeReference: null,
      };
    }

    const canonical = classificationPayload(classification);
    const changedFields = CLASSIFICATION_COLUMNS.filter((column) => comparableText(payload[column]) !== comparableText(canonical[column]));
    for (const column of CLASSIFICATION_COLUMNS) payload[column] = canonical[column];
    const usefulLife = reconcileUsefulLife(payload, classification, usefulLives);

    if (changedFields.length) summary.corrected += 1;
    else summary.matched += 1;
    if (usefulLife.status === 'adjusted') summary.usefulLifeAdjusted += 1;
    if (usefulLife.status === 'needs_review') {
      summary.usefulLifeNeedsReview += 1;
      summary.unresolved += 1;
    }

    return {
      ...item,
      payload,
      classificationYellow: true,
      classificationReviewStatus: changedFields.length ? 'corrected' as const : 'matched' as const,
      classificationChangedFields: changedFields,
      classificationReferenceCode: classification.accountingAssetCode,
      classificationReviewMessage: usefulLife.status === 'needs_review' ? usefulLife.message || null : null,
      usefulLifeReviewStatus: usefulLife.status,
      usefulLifeReference: usefulLife.reference || null,
    };
  });

  return { items: reviewed, summary };
};
