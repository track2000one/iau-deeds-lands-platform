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

  const cached = cellDisplayValue(cell);
  if (meaningful(cached)) return cached;
  if (!cell.f) return '';

  const reference = parseDirectReference(cell.f, sheetName);
  if (!reference) return '';
  return resolveCell(workbook, reference.sheetName, reference.address, visited);
};

/**
 * Converts a sheet to a display-value matrix and fills formula cells whose cached
 * result is missing when the formula is a direct cell reference (including
 * cross-sheet references and IFERROR(reference, "")). Complex formulas are not
 * guessed: when Excel did not save their calculated value they remain unresolved.
 */
export const sheetToResolvedMatrix = (
  workbook: XLSX.WorkBook,
  sheetName: string,
): unknown[][] => {
  const sheet = workbook.Sheets[sheetName];
  if (!sheet) return [];

  const matrix = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
    header: 1,
    defval: '',
    raw: false,
  });

  for (const [address, rawCell] of Object.entries(sheet)) {
    if (address.startsWith('!')) continue;
    const cell = rawCell as FormulaCell;
    if (!cell?.f) continue;
    const decoded = XLSX.utils.decode_cell(address);
    const current = matrix[decoded.r]?.[decoded.c];
    if (meaningful(current)) continue;

    const resolved = resolveCell(workbook, sheetName, address, new Set());
    if (!meaningful(resolved)) continue;
    while (matrix.length <= decoded.r) matrix.push([]);
    while (matrix[decoded.r].length <= decoded.c) matrix[decoded.r].push('');
    matrix[decoded.r][decoded.c] = resolved;
  }

  return matrix;
};
