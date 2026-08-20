import * as XLSX from 'xlsx';
import { MODEL_B_FIELDS, MODEL_B_SHEET_NAME } from '../app/config/fixedAssetModelB';
import { isMeaningfulAccountingValue } from '../app/config/accountingTransformationFields';
import { sheetToResolvedMatrix } from './excelWorkbookValues';

export type ModelBWorkbookRow = {
  recordType: 'fixed_asset';
  sourceSheet: string;
  sourceRow: number;
  payload: Record<string, unknown>;
};

export type ModelBSheetInspection = {
  sheetName: string;
  matchedFields: number;
  confidence: number;
  headerRow: number;
  dataStartRow: number;
  mapping: Record<number, string>;
};

const HEADER_SCAN_ROWS = 18;
const MIN_EXACT_MATCHES = 4;
const MODEL_B_DISTINCTIVE_COLUMNS = new Set(['C', 'AC', 'AD', 'AE', 'AY', 'AZ', 'BA', 'BB']);

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

const normalizedModelBSheetName = normalize(MODEL_B_SHEET_NAME);
const labelToColumns = (() => {
  const map = new Map<string, string[]>();
  for (const field of MODEL_B_FIELDS) {
    for (const label of [field.english, field.arabic]) {
      const key = normalize(label);
      if (!key) continue;
      const current = map.get(key) || [];
      if (!current.includes(field.column)) current.push(field.column);
      map.set(key, current);
    }
  }
  return map;
})();

const matrixFor = (workbook: XLSX.WorkBook, sheetName: string) => sheetToResolvedMatrix(workbook, sheetName);
const headerMatrixFor = (workbook: XLSX.WorkBook, sheetName: string) => sheetToResolvedMatrix(workbook, sheetName, HEADER_SCAN_ROWS);

const inspectSheet = (workbook: XLSX.WorkBook, sheetName: string): ModelBSheetInspection | null => {
  const matrix = headerMatrixFor(workbook, sheetName);
  let best: { rowIndex: number; mapping: Record<number, string>; matches: number; distinctiveMatches: number } | null = null;

  matrix.forEach((row, rowIndex) => {
    const mapping: Record<number, string> = {};
    const used = new Set<string>();
    row.forEach((cell, columnIndex) => {
      const candidates = labelToColumns.get(normalize(cell)) || [];
      const available = candidates.filter((column) => !used.has(column));
      if (available.length !== 1) return;
      mapping[columnIndex] = available[0];
      used.add(available[0]);
    });
    const distinctiveMatches = Array.from(used).filter((column) => MODEL_B_DISTINCTIVE_COLUMNS.has(column)).length;
    if (!best || used.size > best.matches || (used.size === best.matches && distinctiveMatches > best.distinctiveMatches)) {
      best = { rowIndex, mapping, matches: used.size, distinctiveMatches };
    }
  });

  const normalizedSheetName = normalize(sheetName);
  const nameMatches = normalizedSheetName.includes(normalizedModelBSheetName) || normalizedModelBSheetName.includes(normalizedSheetName);
  if (!best || best.matches < MIN_EXACT_MATCHES) return null;

  // Legacy land/building templates share many labels with Model B. A sheet is only
  // treated as Model B when its official sheet name matches, or when the header
  // contains multiple fields that are distinctive to the unified A:BB Model B.
  if (!nameMatches && best.distinctiveMatches < 2) return null;
  if (!nameMatches && best.matches < 8) return null;

  return {
    sheetName,
    matchedFields: best.matches,
    confidence: Math.min(100, best.matches * 2 + best.distinctiveMatches * 8 + (nameMatches ? 20 : 0)),
    headerRow: best.rowIndex + 1,
    dataStartRow: best.rowIndex + 2,
    mapping: best.mapping,
  };
};

export const inspectModelBWorkbook = (workbook: XLSX.WorkBook): ModelBSheetInspection[] =>
  workbook.SheetNames.map((sheetName) => inspectSheet(workbook, sheetName)).filter(Boolean) as ModelBSheetInspection[];

export const parseModelBWorkbook = (
  workbook: XLSX.WorkBook,
  inspections: ModelBSheetInspection[] = inspectModelBWorkbook(workbook),
): ModelBWorkbookRow[] => {
  const rows: ModelBWorkbookRow[] = [];
  for (const inspection of inspections) {
    const matrix = matrixFor(workbook, inspection.sheetName);
    for (let rowIndex = inspection.dataStartRow - 1; rowIndex < matrix.length; rowIndex += 1) {
      const row = matrix[rowIndex] || [];
      const payload: Record<string, unknown> = {};
      Object.entries(inspection.mapping).forEach(([sourceIndex, modelBColumn]) => {
        const value = row[Number(sourceIndex)];
        if (isMeaningfulAccountingValue(value)) payload[modelBColumn] = String(value).trim();
      });
      const meaningful = Object.values(payload).filter(isMeaningfulAccountingValue).length;
      const hasIdentity = ['Y', 'Z', 'AA', 'AB'].some((column) => isMeaningfulAccountingValue(payload[column]));
      if (meaningful < 2 || !hasIdentity) continue;
      rows.push({ recordType: 'fixed_asset', sourceSheet: inspection.sheetName, sourceRow: rowIndex + 1, payload });
    }
  }
  return rows;
};
