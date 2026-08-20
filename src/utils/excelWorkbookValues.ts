import * as XLSX from 'xlsx';

type FormulaCell = XLSX.CellObject & { f?: string };

const meaningful = (value: unknown) => value !== null && value !== undefined && String(value).trim() !== '';

const cellDisplayValue = (cell?: XLSX.CellObject) => {
  if (!cell) return '';
  if (meaningful(cell.w)) return cell.w;
  if (meaningful(cell.v)) return cell.v;
  return '';
};

const normalizeSheetToken = (token: string | undefined, currentSheet: string) => {
  if (!token) return currentSheet;
  const trimmed = token.trim();
  if (trimmed.startsWith("'") && trimmed.endsWith("'")) {
    return trimmed.slice(1, -1).replace(/''/g, "'");
  }
  return trimmed;
};

const parseDirectReference = (formula: string, currentSheet: string) => {
  let expression = String(formula || '').trim();
  expression = expression.replace(/^=/, '').replace(/^\+/, '').trim();

  const ifError = expression.match(/^IFERROR\(\s*([^,;]+?)\s*[,;]\s*""\s*\)$/i);
  if (ifError) expression = ifError[1].trim();

  const match = expression.match(/^(?:((?:'[^']*(?:''[^']*)*'|[^!]+))!)?\$?([A-Z]{1,3})\$?(\d+)$/i);
  if (!match) return null;
  const sheetName = normalizeSheetToken(match[1], currentSheet);
  return { sheetName, address: `${match[2].toUpperCase()}${match[3]}` };
};

const resolveCell = (
  workbook: XLSX.WorkBook,
  sheetName: string,
  address: string,
  visited: Set<string>,
): unknown => {
  const key = `${sheetName}!${address}`;
  if (visited.has(key)) return '';
  visited.add(key);

  const sheet = workbook.Sheets[sheetName];
  if (!sheet) return '';
  const cell = sheet[address] as FormulaCell | undefined;
  if (!cell) return '';

  // For direct-reference formulas, follow the referenced source first. Excel's
  // cached value may be stale (for example E15 displays a new AJ15 value after
  // recalculation while the XLSX cache still contains "غير متوفر").
  if (cell.f) {
    const reference = parseDirectReference(cell.f, sheetName);
    if (reference) {
      const liveReference = resolveCell(workbook, reference.sheetName, reference.address, visited);
      if (meaningful(liveReference)) return liveReference;
    }
  }

  return cellDisplayValue(cell);
};

/**
 * Converts a sheet to a display-value matrix and resolves direct-reference
 * formulas (including cross-sheet references and IFERROR(reference, "")).
 * Direct references deliberately override stale cached formula values. Complex
 * formulas are never guessed and keep their saved Excel result when available.
 * maxRows enables fast header-only scans without materializing the full sheet.
 */
export const sheetToResolvedMatrix = (
  workbook: XLSX.WorkBook,
  sheetName: string,
  maxRows?: number,
): unknown[][] => {
  const sheet = workbook.Sheets[sheetName];
  if (!sheet) return [];

  const decodedRange = XLSX.utils.decode_range(sheet['!ref'] || 'A1:A1');
  const lastRow = maxRows
    ? Math.min(decodedRange.e.r, Math.max(0, maxRows - 1))
    : decodedRange.e.r;
  const range = { s: { r: 0, c: 0 }, e: { r: lastRow, c: decodedRange.e.c } };

  const matrix = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
    header: 1,
    defval: '',
    raw: false,
    range,
  });

  for (const [address, rawCell] of Object.entries(sheet)) {
    if (address.startsWith('!')) continue;
    const cell = rawCell as FormulaCell;
    if (!cell?.f) continue;
    const decoded = XLSX.utils.decode_cell(address);
    if (decoded.r > lastRow) continue;

    const directReference = parseDirectReference(cell.f, sheetName);
    if (!directReference && meaningful(matrix[decoded.r]?.[decoded.c])) continue;

    const resolved = resolveCell(workbook, sheetName, address, new Set());
    if (!meaningful(resolved)) continue;
    while (matrix.length <= decoded.r) matrix.push([]);
    while (matrix[decoded.r].length <= decoded.c) matrix[decoded.r].push('');
    matrix[decoded.r][decoded.c] = resolved;
  }

  return matrix;
};
