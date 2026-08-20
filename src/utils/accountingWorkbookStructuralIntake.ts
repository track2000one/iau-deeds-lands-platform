import * as XLSX from 'xlsx';
import {
  ACCOUNTING_FIELDS,
  excelColumnToIndex,
  isMeaningfulAccountingValue,
  type AccountingRecordType,
} from '../app/config/accountingTransformationFields';
import { sheetToResolvedMatrix } from './excelWorkbookValues';

export type StructuralAccountingSheetInspection = {
  sheetName: string;
  rowCount: number;
  columnCount: number;
  recordType?: AccountingRecordType;
  mapping: Record<number, string>;
  dataStartRow: number;
  matchedFields: number;
  confidence: number;
  mode: 'template' | 'header' | 'name-fallback' | 'unmapped';
};

export type StructuralAccountingWorkbookInspection = {
  sheets: StructuralAccountingSheetInspection[];
  mappedSheetCount: number;
  unmappedSheetCount: number;
  officialTemplateUsed: boolean;
};

export type StructuralAccountingIntakeRow = {
  recordType: AccountingRecordType;
  sourceSheet: string;
  sourceRow: number;
  payload: Record<string, unknown>;
};

type CanonicalProfile = {
  recordType: AccountingRecordType;
  labels: Map<string, Set<string>>;
  reverseLabels: Map<string, string[]>;
  dataStartRow: number;
};

const HEADER_SCAN_ROWS = 16;
const MIN_HEADER_MATCHES = 3;

const normalizeText = (value: unknown) => String(value ?? '')
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

const meaningfulHeader = (value: unknown) => {
  const text = String(value ?? '').trim();
  return text.length >= 2 && text.length <= 420;
};

const matrixFor = (workbook: XLSX.WorkBook, sheetName: string) => sheetToResolvedMatrix(workbook, sheetName);

const headerMatrixFor = (workbook: XLSX.WorkBook, sheetName: string) =>
  sheetToResolvedMatrix(workbook, sheetName).slice(0, HEADER_SCAN_ROWS);

const sheetDimensions = (sheet: XLSX.WorkSheet) => {
  const range = XLSX.utils.decode_range(sheet['!ref'] || 'A1:A1');
  return { rowCount: range.e.r + 1, columnCount: range.e.c + 1 };
};

const buildBaseProfile = (recordType: AccountingRecordType): CanonicalProfile => {
  const labels = new Map<string, Set<string>>();
  for (const field of ACCOUNTING_FIELDS[recordType]) {
    const values = new Set<string>();
    const normalized = normalizeText(field.a);
    if (normalized) values.add(normalized);
    labels.set(field.c, values);
  }
  return { recordType, labels, reverseLabels: new Map(), dataStartRow: 7 };
};

const rebuildReverse = (profile: CanonicalProfile) => {
  const reverse = new Map<string, string[]>();
  profile.labels.forEach((values, canonicalColumn) => {
    values.forEach((value) => {
      const existing = reverse.get(value) || [];
      if (!existing.includes(canonicalColumn)) existing.push(canonicalColumn);
      reverse.set(value, existing);
    });
  });
  profile.reverseLabels = reverse;
};

const scoreOfficialSheet = (workbook: XLSX.WorkBook, sheetName: string, recordType: AccountingRecordType) => {
  const values = headerMatrixFor(workbook, sheetName).flat().map(normalizeText).filter(Boolean);
  const name = normalizeText(sheetName);
  let score = 0;
  for (const field of ACCOUNTING_FIELDS[recordType]) {
    const label = normalizeText(field.a);
    if (label && values.some((value) => value === label || value.includes(label))) score += 1;
  }
  if (recordType === 'building' && (name.includes('building') || name.includes('مباني'))) score += 8;
  if (recordType === 'land' && (name.includes('land') || name.includes('اراضي') || name.includes('ارض'))) score += 8;
  return score;
};

const enrichProfileFromOfficialWorkbook = (profile: CanonicalProfile, officialWorkbook?: XLSX.WorkBook) => {
  if (!officialWorkbook) {
    rebuildReverse(profile);
    return;
  }

  const ranked = officialWorkbook.SheetNames
    .map((sheetName) => ({ sheetName, score: scoreOfficialSheet(officialWorkbook, sheetName, profile.recordType) }))
    .sort((a, b) => b.score - a.score);
  const best = ranked[0];
  if (!best || best.score < MIN_HEADER_MATCHES) {
    rebuildReverse(profile);
    return;
  }

  const matrix = headerMatrixFor(officialWorkbook, best.sheetName);
  let lastCanonicalHeaderRow = -1;
  for (const field of ACCOUNTING_FIELDS[profile.recordType]) {
    const columnIndex = excelColumnToIndex(field.c);
    const labels = profile.labels.get(field.c) || new Set<string>();
    const fieldLabel = normalizeText(field.a);
    matrix.forEach((row, rowIndex) => {
      const raw = row[columnIndex];
      if (!meaningfulHeader(raw)) return;
      const normalized = normalizeText(raw);
      if (!normalized) return;
      labels.add(normalized);
      if (fieldLabel && (normalized === fieldLabel || normalized.includes(fieldLabel))) {
        lastCanonicalHeaderRow = Math.max(lastCanonicalHeaderRow, rowIndex);
      }
    });
    profile.labels.set(field.c, labels);
  }
  if (lastCanonicalHeaderRow >= 0) profile.dataStartRow = Math.max(7, lastCanonicalHeaderRow + 1);
  rebuildReverse(profile);
};

const buildProfiles = (officialWorkbook?: XLSX.WorkBook) => {
  const land = buildBaseProfile('land');
  const building = buildBaseProfile('building');
  enrichProfileFromOfficialWorkbook(land, officialWorkbook);
  enrichProfileFromOfficialWorkbook(building, officialWorkbook);
  return { land, building };
};

const labelMatches = (cellValue: string, profile: CanonicalProfile) => {
  const direct = profile.reverseLabels.get(cellValue);
  if (direct?.length) return direct;
  if (cellValue.length < 5) return [];
  const matches: string[] = [];
  profile.labels.forEach((labels, column) => {
    for (const label of labels) {
      if (label.length < 5) continue;
      if (cellValue.includes(label) || label.includes(cellValue)) {
        matches.push(column);
        break;
      }
    }
  });
  return matches;
};

const inspectSheetAgainstProfile = (workbook: XLSX.WorkBook, sheetName: string, profile: CanonicalProfile) => {
  const headerRows = headerMatrixFor(workbook, sheetName);
  let bestRow = -1;
  let bestRowMapping: Record<number, string> = {};
  let bestRowMatches = 0;

  headerRows.forEach((row, rowIndex) => {
    const mapping: Record<number, string> = {};
    const used = new Set<string>();
    row.forEach((raw, columnIndex) => {
      const normalized = normalizeText(raw);
      if (!normalized) return;
      const candidates = labelMatches(normalized, profile).filter((column) => !used.has(column));
      if (candidates.length === 1) {
        mapping[columnIndex] = candidates[0];
        used.add(candidates[0]);
      }
    });
    if (used.size > bestRowMatches) {
      bestRow = rowIndex;
      bestRowMatches = used.size;
      bestRowMapping = mapping;
    }
  });

  let positionalMatches = 0;
  for (const field of ACCOUNTING_FIELDS[profile.recordType]) {
    const columnIndex = excelColumnToIndex(field.c);
    const values = headerRows.map((row) => normalizeText(row[columnIndex])).filter(Boolean);
    const labels = profile.labels.get(field.c) || new Set<string>();
    if (values.some((value) => labels.has(value) || Array.from(labels).some((label) => label.length >= 5 && (value.includes(label) || label.includes(value))))) {
      positionalMatches += 1;
    }
  }

  const normalizedName = normalizeText(sheetName);
  const nameMatches = profile.recordType === 'building'
    ? normalizedName.includes('building') || normalizedName.includes('مباني')
    : normalizedName.includes('land') || normalizedName.includes('اراضي') || normalizedName.includes('ارض');

  const templateLike = positionalMatches >= Math.max(MIN_HEADER_MATCHES, Math.floor(bestRowMatches * 0.75));
  let mapping: Record<number, string> = {};
  let mode: StructuralAccountingSheetInspection['mode'] = 'unmapped';
  let matchedFields = 0;
  let dataStartRow = profile.dataStartRow;

  if (templateLike && positionalMatches >= MIN_HEADER_MATCHES) {
    for (const field of ACCOUNTING_FIELDS[profile.recordType]) mapping[excelColumnToIndex(field.c)] = field.c;
    mode = 'template';
    matchedFields = positionalMatches;
  } else if (bestRowMatches >= MIN_HEADER_MATCHES) {
    mapping = bestRowMapping;
    mode = 'header';
    matchedFields = bestRowMatches;
    dataStartRow = bestRow + 1;
  } else if (nameMatches) {
    for (const field of ACCOUNTING_FIELDS[profile.recordType]) mapping[excelColumnToIndex(field.c)] = field.c;
    mode = 'name-fallback';
    matchedFields = Math.max(bestRowMatches, positionalMatches);
  }

  const confidence = Math.min(100, matchedFields * 8 + (mode === 'template' ? 20 : 0) + (nameMatches ? 10 : 0));
  return { mapping, mode, matchedFields, dataStartRow, confidence, evidence: Math.max(bestRowMatches, positionalMatches) };
};

export const inspectAccountingWorkbookStructure = (
  workbook: XLSX.WorkBook,
  officialWorkbook?: XLSX.WorkBook,
): StructuralAccountingWorkbookInspection => {
  const profiles = buildProfiles(officialWorkbook);
  const sheets = workbook.SheetNames.map((sheetName) => {
    const dimensions = sheetDimensions(workbook.Sheets[sheetName]);
    const land = inspectSheetAgainstProfile(workbook, sheetName, profiles.land);
    const building = inspectSheetAgainstProfile(workbook, sheetName, profiles.building);
    const bestType: AccountingRecordType | undefined = land.mode === 'unmapped' && building.mode === 'unmapped'
      ? undefined
      : building.confidence > land.confidence ? 'building'
        : land.confidence > building.confidence ? 'land'
          : building.evidence > land.evidence ? 'building' : 'land';
    const best = bestType === 'building' ? building : bestType === 'land' ? land : undefined;
    return {
      sheetName,
      ...dimensions,
      recordType: bestType,
      mapping: best?.mapping || {},
      dataStartRow: best?.dataStartRow ?? 0,
      matchedFields: best?.matchedFields ?? 0,
      confidence: best?.confidence ?? 0,
      mode: best?.mode || 'unmapped',
    } satisfies StructuralAccountingSheetInspection;
  });

  return {
    sheets,
    mappedSheetCount: sheets.filter((sheet) => sheet.recordType).length,
    unmappedSheetCount: sheets.filter((sheet) => !sheet.recordType).length,
    officialTemplateUsed: Boolean(officialWorkbook),
  };
};

export const parseAccountingWorkbookStructure = (
  workbook: XLSX.WorkBook,
  inspection: StructuralAccountingWorkbookInspection,
): StructuralAccountingIntakeRow[] => {
  const output: StructuralAccountingIntakeRow[] = [];
  for (const sheetInfo of inspection.sheets) {
    if (!sheetInfo.recordType || !Object.keys(sheetInfo.mapping).length) continue;
    const rows = matrixFor(workbook, sheetInfo.sheetName);
    const startIndex = Math.max(0, sheetInfo.dataStartRow);
    for (let rowIndex = startIndex; rowIndex < rows.length; rowIndex += 1) {
      const row = rows[rowIndex] || [];
      const payload: Record<string, unknown> = {};
      Object.entries(sheetInfo.mapping).forEach(([sourceColumn, canonicalColumn]) => {
        const value = row[Number(sourceColumn)];
        if (isMeaningfulAccountingValue(value)) payload[canonicalColumn] = String(value).trim();
      });
      const meaningful = Object.values(payload).filter(isMeaningfulAccountingValue).length;
      const hasIdentity = ['B', 'D', 'E', 'G'].some((column) => isMeaningfulAccountingValue(payload[column]));
      if (meaningful < 2 || !hasIdentity) continue;
      output.push({ recordType: sheetInfo.recordType, sourceSheet: sheetInfo.sheetName, sourceRow: rowIndex + 1, payload });
    }
  }
  return output;
};
