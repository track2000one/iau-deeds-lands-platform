import JSZip from 'jszip';
import type { AccountingTransformationRecord } from '../types/accountingTransformation';
import { ACCOUNTING_FIELDS, type AccountingRecordType as LegacyRecordType } from '../app/config/accountingTransformationFields';
import { MODEL_B_FIELDS, MODEL_B_SHEET_NAME } from '../app/config/fixedAssetModelB';

const XML_NS = 'http://schemas.openxmlformats.org/spreadsheetml/2006/main';
const REL_NS = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships';
const PKG_REL_NS = 'http://schemas.openxmlformats.org/package/2006/relationships';
const MODEL_B_FALLBACK_DATA_ROW = 5;
const LEGACY_FALLBACK_DATA_ROW = 8;
const HEADER_SCAN_LIMIT = 40;

const normalize = (value: string) => value.toLowerCase().replace(/[ـ]/g, '').replace(/[أإآ]/g, 'ا').replace(/ة/g, 'ه').replace(/ى/g, 'ي').replace(/\s+/g, ' ').trim();
const text = (value: unknown) => value === null || value === undefined ? '' : String(value).trim();
const colFromRef = (ref: string) => (ref.match(/^[A-Z]+/) || [''])[0];
const directChild = (parent: Element, name: string) => Array.from(parent.children).find((child) => child.localName === name) || null;
const rowElement = (sheetData: Element, row: number) => Array.from(sheetData.children).find((child) => child.localName === 'row' && child.getAttribute('r') === String(row)) || null;
const cellElement = (row: Element, ref: string) => Array.from(row.children).find((child) => child.localName === 'c' && child.getAttribute('r') === ref) || null;
const clearCell = (cell: Element) => { Array.from(cell.children).forEach((child) => cell.removeChild(child)); cell.removeAttribute('t'); };
const setInline = (doc: XMLDocument, cell: Element, value: string) => {
  clearCell(cell); if (!value) return; cell.setAttribute('t', 'inlineStr');
  const is = doc.createElementNS(XML_NS, 'is'); const t = doc.createElementNS(XML_NS, 't'); t.textContent = value; is.appendChild(t); cell.appendChild(is);
};
const setNumber = (doc: XMLDocument, cell: Element, value: number) => { clearCell(cell); const v = doc.createElementNS(XML_NS, 'v'); v.textContent = String(value); cell.appendChild(v); };
const setFormula = (doc: XMLDocument, cell: Element, formula: string) => { clearCell(cell); const f = doc.createElementNS(XML_NS, 'f'); f.textContent = formula; cell.appendChild(f); };
const ensureCell = (doc: XMLDocument, row: Element, column: string, rowNumber: number) => {
  const ref = `${column}${rowNumber}`; let cell = cellElement(row, ref); if (cell) return cell;
  cell = doc.createElementNS(XML_NS, 'c'); cell.setAttribute('r', ref); row.appendChild(cell); return cell;
};
const cloneRow = (source: Element, rowNumber: number) => {
  const sourceNumber = Number(source.getAttribute('r') || rowNumber);
  const cloned = source.cloneNode(true) as Element; cloned.setAttribute('r', String(rowNumber));
  Array.from(cloned.children).forEach((child) => {
    if (child.localName !== 'c') return;
    const c = colFromRef(child.getAttribute('r') || ''); if (c) child.setAttribute('r', `${c}${rowNumber}`);
    const formula = directChild(child, 'f');
    if (formula?.textContent) formula.textContent = formula.textContent.replace(new RegExp(`(?<=[A-Z])${sourceNumber}(?!\\d)`, 'g'), String(rowNumber));
  });
  return cloned;
};

type SheetInfo = { name: string; path: string };
type SharedStrings = string[];

const workbookSheets = (workbookXml: string, relsXml: string): SheetInfo[] => {
  const parser = new DOMParser(); const wb = parser.parseFromString(workbookXml, 'application/xml'); const rels = parser.parseFromString(relsXml, 'application/xml');
  const relationships = Array.from(rels.getElementsByTagNameNS(PKG_REL_NS, 'Relationship'));
  return Array.from(wb.getElementsByTagNameNS(XML_NS, 'sheet')).map((sheet) => {
    const id = sheet.getAttributeNS(REL_NS, 'id') || sheet.getAttribute('r:id') || '';
    const rel = relationships.find((item) => item.getAttribute('Id') === id); const target = rel?.getAttribute('Target') || '';
    return { name: sheet.getAttribute('name') || '', path: target.startsWith('/') ? target.slice(1) : `xl/${target.replace(/^\.\//, '')}` };
  }).filter((x) => x.path);
};

const loadSharedStrings = async (zip: JSZip): Promise<SharedStrings> => {
  const file = zip.file('xl/sharedStrings.xml');
  if (!file) return [];
  const parser = new DOMParser();
  const doc = parser.parseFromString(await file.async('string'), 'application/xml');
  return Array.from(doc.getElementsByTagNameNS(XML_NS, 'si')).map((item) =>
    Array.from(item.getElementsByTagNameNS(XML_NS, 't')).map((node) => node.textContent || '').join('')
  );
};

const cellDisplayText = (cell: Element, sharedStrings: SharedStrings) => {
  const type = cell.getAttribute('t') || '';
  if (type === 'inlineStr') {
    return Array.from(cell.getElementsByTagNameNS(XML_NS, 't')).map((node) => node.textContent || '').join('');
  }
  const value = directChild(cell, 'v')?.textContent || '';
  if (type === 's') return sharedStrings[Number(value)] || '';
  return value;
};

const rowTexts = (row: Element, sharedStrings: SharedStrings) => Array.from(row.children)
  .filter((child) => child.localName === 'c')
  .map((cell) => normalize(cellDisplayText(cell, sharedStrings)))
  .filter(Boolean);

const findHeaderRowNumber = (
  sheetData: Element,
  sharedStrings: SharedStrings,
  labels: string[],
  minimumMatches: number,
) => {
  const expected = Array.from(new Set(labels.map(normalize).filter((label) => label.length >= 3)));
  let best: { row: number; matches: number } | null = null;
  for (const row of Array.from(sheetData.children)) {
    if (row.localName !== 'row') continue;
    const rowNumber = Number(row.getAttribute('r') || 0);
    if (!rowNumber || rowNumber > HEADER_SCAN_LIMIT) continue;
    const values = rowTexts(row, sharedStrings);
    if (!values.length) continue;
    let matches = 0;
    for (const label of expected) {
      if (values.some((value) => value === label || (label.length >= 8 && (value.includes(label) || label.includes(value))))) matches += 1;
    }
    if (!best || matches > best.matches || (matches === best.matches && rowNumber > best.row)) best = { row: rowNumber, matches };
  }
  return best && best.matches >= minimumMatches ? best.row : null;
};

const firstTemplateRowAtOrAfter = (sheetData: Element, rowNumber: number) => Array.from(sheetData.children)
  .filter((child) => child.localName === 'row' && Number(child.getAttribute('r') || 0) >= rowNumber)
  .sort((a, b) => Number(a.getAttribute('r') || 0) - Number(b.getAttribute('r') || 0))[0] as Element | undefined;

const protectedRowsSnapshot = (sheetData: Element, beforeRow: number) => {
  const serializer = new XMLSerializer();
  return Array.from(sheetData.children)
    .filter((child) => child.localName === 'row' && Number(child.getAttribute('r') || 0) < beforeRow)
    .map((row) => serializer.serializeToString(row))
    .join('');
};

const assertProtectedRowsUnchanged = (sheetData: Element, beforeRow: number, snapshot: string) => {
  if (protectedRowsSnapshot(sheetData, beforeRow) !== snapshot) {
    throw new Error('تم إيقاف إنشاء الملف لحماية تنسيق مسميات الأعمدة؛ اكتشف النظام تغييرًا غير متوقع في منطقة العناوين.');
  }
};

const updateDimensionEndRow = (doc: XMLDocument, fallbackEndColumn: string, lastRow: number) => {
  const dimension = doc.getElementsByTagNameNS(XML_NS, 'dimension')[0];
  if (!dimension) return;
  const current = dimension.getAttribute('ref') || `A1:${fallbackEndColumn}${lastRow}`;
  const [startRef = 'A1', endRef = `${fallbackEndColumn}${lastRow}`] = current.split(':');
  const endColumn = colFromRef(endRef.replace(/\$/g, '')) || fallbackEndColumn;
  dimension.setAttribute('ref', `${startRef}:${endColumn}${lastRow}`);
};

const findLegacySheet = (sheets: SheetInfo[], type: LegacyRecordType) => sheets.find((sheet) => {
  const n = normalize(sheet.name); return type === 'land' ? n.includes('الاراضي') || n.includes('land') : n.includes('المباني') || n.includes('building');
}) || null;

const fillLegacySheet = async (zip: JSZip, sheet: SheetInfo, items: AccountingTransformationRecord[], type: LegacyRecordType, sharedStrings: SharedStrings) => {
  const file = zip.file(sheet.path); if (!file) return 0;
  const parser = new DOMParser(); const serializer = new XMLSerializer(); const doc = parser.parseFromString(await file.async('string'), 'application/xml');
  const sheetData = doc.getElementsByTagNameNS(XML_NS, 'sheetData')[0]; if (!sheetData) return 0;
  const headerRow = findHeaderRowNumber(sheetData, sharedStrings, ACCOUNTING_FIELDS[type].map((field) => field.a), 6);
  const dataStartRow = headerRow ? headerRow + 1 : LEGACY_FALLBACK_DATA_ROW;
  const templateRow = rowElement(sheetData, dataStartRow) || firstTemplateRowAtOrAfter(sheetData, dataStartRow);
  if (!templateRow) throw new Error(`تعذر العثور على صف البيانات في ورقة ${sheet.name}`);
  const protectedSnapshot = protectedRowsSnapshot(sheetData, dataStartRow);
  const pristine = templateRow.cloneNode(true) as Element;
  Array.from(sheetData.children).forEach((child) => { if (child.localName === 'row' && Number(child.getAttribute('r')) >= dataStartRow) sheetData.removeChild(child); });
  items.forEach((item, index) => {
    const rowNumber = dataStartRow + index; const row = cloneRow(pristine, rowNumber); sheetData.appendChild(row);
    ACCOUNTING_FIELDS[type].forEach((field) => setInline(doc, ensureCell(doc, row, field.c, rowNumber), text(item.payload?.[field.c])));
  });
  assertProtectedRowsUnchanged(sheetData, dataStartRow, protectedSnapshot);
  const fallbackEndColumn = ACCOUNTING_FIELDS[type].at(-1)?.c || 'BB';
  updateDimensionEndRow(doc, fallbackEndColumn, Math.max(dataStartRow, dataStartRow + items.length - 1));
  zip.file(sheet.path, serializer.serializeToString(doc));
  return items.length;
};

const excelSerial = (value: unknown) => {
  if (!value) return null;
  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) return null;
  const utc = Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
  return utc / 86400000 + 25569;
};

const setModelBValue = (doc: XMLDocument, cell: Element, column: string, value: unknown) => {
  if (['AF','AY'].includes(column)) {
    const serial = excelSerial(value);
    if (serial !== null) return setNumber(doc, cell, serial);
  }
  if (typeof value === 'number' && Number.isFinite(value)) return setNumber(doc, cell, value);
  setInline(doc, cell, text(value));
};

const remainingLifeFormula = (row: number) => {
  const now = new Date();
  return `IFERROR(MAX(0,AO${row}-(DATE(${now.getFullYear()},${now.getMonth() + 1},${now.getDate()})-AF${row})/365),\"\")`;
};

const fillModelBSheet = async (zip: JSZip, sheet: SheetInfo, items: AccountingTransformationRecord[], sharedStrings: SharedStrings) => {
  const file = zip.file(sheet.path); if (!file) return 0;
  const parser = new DOMParser(); const serializer = new XMLSerializer(); const doc = parser.parseFromString(await file.async('string'), 'application/xml');
  const sheetData = doc.getElementsByTagNameNS(XML_NS, 'sheetData')[0]; if (!sheetData) throw new Error('ورقة سجل الأصول لا تحتوي منطقة بيانات.');
  const modelBLabels = MODEL_B_FIELDS.flatMap((field) => [field.arabic, field.english]);
  const headerRow = findHeaderRowNumber(sheetData, sharedStrings, modelBLabels, 8);
  const dataStartRow = headerRow ? headerRow + 1 : MODEL_B_FALLBACK_DATA_ROW;
  const templateRow = rowElement(sheetData, dataStartRow) || firstTemplateRowAtOrAfter(sheetData, dataStartRow);
  if (!templateRow) throw new Error(`تعذر العثور على صف البيانات الأول في نموذج ب بعد صف العناوين${headerRow ? ` (${headerRow})` : ''}.`);
  const protectedSnapshot = protectedRowsSnapshot(sheetData, dataStartRow);
  const pristine = templateRow.cloneNode(true) as Element;
  Array.from(sheetData.children).forEach((child) => { if (child.localName === 'row' && Number(child.getAttribute('r')) >= dataStartRow) sheetData.removeChild(child); });
  const fixed = items.filter((item) => item.recordType === 'fixed_asset');
  fixed.forEach((item, index) => {
    const rowNumber = dataStartRow + index;
    const row = cloneRow(pristine, rowNumber);
    for (const field of MODEL_B_FIELDS) {
      const cell = ensureCell(doc, row, field.column, rowNumber);
      const value = item.payload?.[field.column];
      const hasValue = value !== null && value !== undefined && String(value).trim() !== '';
      if (field.column === 'AP' && !hasValue) setFormula(doc, cell, remainingLifeFormula(rowNumber));
      else if (hasValue) setModelBValue(doc, cell, field.column, value);
      else if (!directChild(cell, 'f')) clearCell(cell);
    }
    sheetData.appendChild(row);
  });
  assertProtectedRowsUnchanged(sheetData, dataStartRow, protectedSnapshot);
  updateDimensionEndRow(doc, 'BB', Math.max(dataStartRow, dataStartRow + fixed.length - 1));
  zip.file(sheet.path, serializer.serializeToString(doc));
  return fixed.length;
};

const forceRecalculation = (workbookXml: string) => {
  const parser = new DOMParser(); const doc = parser.parseFromString(workbookXml, 'application/xml');
  let calcPr = doc.getElementsByTagNameNS(XML_NS, 'calcPr')[0];
  if (!calcPr) { calcPr = doc.createElementNS(XML_NS, 'calcPr'); doc.documentElement.appendChild(calcPr); }
  calcPr.setAttribute('calcMode', 'auto'); calcPr.setAttribute('fullCalcOnLoad', '1'); calcPr.setAttribute('forceFullCalc', '1');
  return new XMLSerializer().serializeToString(doc);
};

export const buildOfficialAccountingTransformationExcel = async (templateBuffer: ArrayBuffer, items: AccountingTransformationRecord[]) => {
  const zip = await JSZip.loadAsync(templateBuffer);
  const workbookFile = zip.file('xl/workbook.xml'); const relsFile = zip.file('xl/_rels/workbook.xml.rels');
  const workbookXml = await workbookFile?.async('string'); const relsXml = await relsFile?.async('string');
  if (!workbookXml || !relsXml) throw new Error('ملف النموذج الرسمي غير صالح.');
  const sheets = workbookSheets(workbookXml, relsXml);
  const sharedStrings = await loadSharedStrings(zip);
  const modelBSheet = sheets.find((sheet) => normalize(sheet.name) === normalize(MODEL_B_SHEET_NAME));
  let exportedCount = 0;
  let mode: 'model_b' | 'legacy' = 'legacy';

  if (modelBSheet) {
    mode = 'model_b';
    exportedCount = await fillModelBSheet(zip, modelBSheet, items, sharedStrings);
    if (!exportedCount && items.some((item) => item.recordType !== 'fixed_asset')) {
      throw new Error('القالب الرسمي هو نموذج ب، لكن السجلات المحددة ما زالت من مصادر Legacy. يجب ترحيلها/استيرادها إلى سجل الأصول الثابتة قبل إخراج نموذج ب النهائي.');
    }
  } else {
    const landSheet = findLegacySheet(sheets, 'land'); const buildingSheet = findLegacySheet(sheets, 'building');
    if (!landSheet && !buildingSheet) throw new Error('لم يتم العثور على ورقة «سجل الأصول» لنموذج ب ولا أوراق Legacy للأراضي/المباني في النموذج الرسمي.');
    if (landSheet) exportedCount += await fillLegacySheet(zip, landSheet, items.filter((x) => x.recordType === 'land'), 'land', sharedStrings);
    if (buildingSheet) exportedCount += await fillLegacySheet(zip, buildingSheet, items.filter((x) => x.recordType === 'building'), 'building', sharedStrings);
  }

  zip.file('xl/workbook.xml', forceRecalculation(workbookXml));
  if (zip.file('xl/calcChain.xml')) zip.remove('xl/calcChain.xml');
  const blob = await zip.generateAsync({ type: 'blob', mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', compression: 'DEFLATE', compressionOptions: { level: 6 } });
  return { blob, exportedCount, mode, skippedCount: Math.max(0, items.length - exportedCount) };
};
