import JSZip from 'jszip';
import type { AssetRecord } from '../types/asset';
import { MODEL_B_FIELDS, MODEL_B_SHEET_NAME, MODEL_B_VERSION, modelBValuesFromAsset } from '../app/config/fixedAssetModelB';
import {
  buildOfficialAssetExcel as buildLegacyOfficialAssetExcel,
  type OfficialAssetExcelExportResult,
  type OfficialAssetExcelSheetResult,
} from './officialAssetExcelLegacy';

export type { OfficialAssetExcelExportResult, OfficialAssetExcelSheetResult };

const XML_NS = 'http://schemas.openxmlformats.org/spreadsheetml/2006/main';
const REL_NS = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships';
const PKG_REL_NS = 'http://schemas.openxmlformats.org/package/2006/relationships';
const FIRST_DATA_ROW = 5;
const DATE_COLUMNS = new Set(['AF', 'AY']);
const MODEL_B_COLUMNS = MODEL_B_FIELDS.map((field) => field.column);

const normalize = (value: unknown) => String(value ?? '')
  .trim()
  .toLowerCase()
  .replace(/[ـ]/g, '')
  .replace(/[\u064B-\u065F\u0670]/g, '')
  .replace(/[أإآ]/g, 'ا')
  .replace(/ى/g, 'ي')
  .replace(/ة/g, 'ه')
  .replace(/\s+/g, ' ');

const directChild = (parent: Element, localName: string) => Array.from(parent.children).find((child) => child.localName === localName) || null;
const rowElement = (sheetData: Element, row: number) => Array.from(sheetData.children).find((child) => child.localName === 'row' && child.getAttribute('r') === String(row)) || null;
const cellElement = (row: Element, ref: string) => Array.from(row.children).find((child) => child.localName === 'c' && child.getAttribute('r') === ref) || null;
const columnFromRef = (ref: string) => (ref.match(/^[A-Z]+/) || [''])[0];

const clearCell = (cell: Element) => {
  Array.from(cell.children).forEach((child) => cell.removeChild(child));
  cell.removeAttribute('t');
};

const setInlineText = (doc: XMLDocument, cell: Element, value: string) => {
  clearCell(cell);
  if (!value) return;
  cell.setAttribute('t', 'inlineStr');
  const is = doc.createElementNS(XML_NS, 'is');
  const t = doc.createElementNS(XML_NS, 't');
  t.textContent = value;
  is.appendChild(t);
  cell.appendChild(is);
};

const setNumber = (doc: XMLDocument, cell: Element, value: number) => {
  clearCell(cell);
  const v = doc.createElementNS(XML_NS, 'v');
  v.textContent = String(value);
  cell.appendChild(v);
};

const setFormula = (doc: XMLDocument, cell: Element, formula: string) => {
  clearCell(cell);
  const f = doc.createElementNS(XML_NS, 'f');
  f.textContent = formula;
  cell.appendChild(f);
};

const excelSerial = (value: unknown) => {
  if (!value) return null;
  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) return null;
  const utc = Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
  return utc / 86400000 + 25569;
};

const setValue = (doc: XMLDocument, cell: Element, column: string, value: unknown) => {
  if (DATE_COLUMNS.has(column)) {
    const serial = excelSerial(value);
    if (serial !== null) return setNumber(doc, cell, serial);
  }
  if (typeof value === 'number' && Number.isFinite(value)) return setNumber(doc, cell, value);
  setInlineText(doc, cell, value === null || value === undefined ? '' : String(value).trim());
};

const ensureCell = (doc: XMLDocument, row: Element, column: string, rowNumber: number) => {
  const ref = `${column}${rowNumber}`;
  let cell = cellElement(row, ref);
  if (cell) return cell;
  cell = doc.createElementNS(XML_NS, 'c');
  cell.setAttribute('r', ref);
  row.appendChild(cell);
  return cell;
};

const cloneTemplateRow = (sourceRow: Element, rowNumber: number) => {
  const sourceNumber = Number(sourceRow.getAttribute('r') || FIRST_DATA_ROW);
  const cloned = sourceRow.cloneNode(true) as Element;
  cloned.setAttribute('r', String(rowNumber));
  Array.from(cloned.children).forEach((child) => {
    if (child.localName !== 'c') return;
    const column = columnFromRef(child.getAttribute('r') || '');
    if (column) child.setAttribute('r', `${column}${rowNumber}`);
    const formula = directChild(child, 'f');
    if (formula?.textContent) formula.textContent = formula.textContent.replace(new RegExp(`(?<=[A-Z])${sourceNumber}(?!\\d)`, 'g'), String(rowNumber));
  });
  return cloned;
};

const workbookSheets = (workbookXml: string, relsXml: string) => {
  const parser = new DOMParser();
  const workbookDoc = parser.parseFromString(workbookXml, 'application/xml');
  const relsDoc = parser.parseFromString(relsXml, 'application/xml');
  const relationships = Array.from(relsDoc.getElementsByTagNameNS(PKG_REL_NS, 'Relationship'));
  return Array.from(workbookDoc.getElementsByTagNameNS(XML_NS, 'sheet')).map((sheet) => {
    const name = sheet.getAttribute('name') || '';
    const relationshipId = sheet.getAttributeNS(REL_NS, 'id') || sheet.getAttribute('r:id') || '';
    const relationship = relationships.find((item) => item.getAttribute('Id') === relationshipId);
    const target = relationship?.getAttribute('Target') || '';
    return { name, path: target.startsWith('/') ? target.slice(1) : `xl/${target.replace(/^\.\//, '')}` };
  }).filter((sheet) => sheet.path);
};

const forceRecalculation = (workbookXml: string) => {
  const parser = new DOMParser();
  const doc = parser.parseFromString(workbookXml, 'application/xml');
  let calcPr = doc.getElementsByTagNameNS(XML_NS, 'calcPr')[0];
  if (!calcPr) {
    calcPr = doc.createElementNS(XML_NS, 'calcPr');
    doc.documentElement.appendChild(calcPr);
  }
  calcPr.setAttribute('calcMode', 'auto');
  calcPr.setAttribute('fullCalcOnLoad', '1');
  calcPr.setAttribute('forceFullCalc', '1');
  return new XMLSerializer().serializeToString(doc);
};

const asOfDateFormula = (row: number) => {
  const now = new Date();
  return `IFERROR(MAX(0,AO${row}-(DATE(${now.getFullYear()},${now.getMonth() + 1},${now.getDate()})-AF${row})/365),\"\")`;
};

const buildModelBExcel = async (templateBuffer: ArrayBuffer, assets: AssetRecord[]): Promise<OfficialAssetExcelExportResult | null> => {
  const zip = await JSZip.loadAsync(templateBuffer);
  const workbookFile = zip.file('xl/workbook.xml');
  const relsFile = zip.file('xl/_rels/workbook.xml.rels');
  if (!workbookFile || !relsFile) return null;
  const workbookXml = await workbookFile.async('string');
  const relsXml = await relsFile.async('string');
  const sheets = workbookSheets(workbookXml, relsXml);
  const modelBSheet = sheets.find((sheet) => normalize(sheet.name) === normalize(MODEL_B_SHEET_NAME));
  if (!modelBSheet) return null;

  const sheetFile = zip.file(modelBSheet.path);
  if (!sheetFile) throw new Error('تم العثور على ورقة سجل الأصول لكن تعذر فتح بنيتها الداخلية.');
  const parser = new DOMParser();
  const doc = parser.parseFromString(await sheetFile.async('string'), 'application/xml');
  const sheetData = doc.getElementsByTagNameNS(XML_NS, 'sheetData')[0];
  if (!sheetData) throw new Error('ورقة سجل الأصول لا تحتوي منطقة بيانات قابلة للكتابة.');
  const templateRow = rowElement(sheetData, FIRST_DATA_ROW);
  if (!templateRow) throw new Error('تعذر العثور على صف نموذج ب الأول (الصف 5) للحفاظ على تنسيق النموذج الرسمي.');
  const pristineTemplate = templateRow.cloneNode(true) as Element;

  const existingRows = Array.from(sheetData.children).filter((child) => child.localName === 'row' && Number(child.getAttribute('r')) >= FIRST_DATA_ROW);
  existingRows.forEach((row) => sheetData.removeChild(row));

  assets.forEach((asset, index) => {
    const rowNumber = FIRST_DATA_ROW + index;
    const row = cloneTemplateRow(pristineTemplate, rowNumber);
    const values = modelBValuesFromAsset(asset);

    for (const column of MODEL_B_COLUMNS) {
      const cell = ensureCell(doc, row, column, rowNumber);
      const formula = directChild(cell, 'f');
      const value = values[column];
      const hasValue = value !== null && value !== undefined && String(value).trim() !== '';

      if (column === 'AP' && !hasValue) {
        setFormula(doc, cell, asOfDateFormula(rowNumber));
        continue;
      }
      if (hasValue) {
        setValue(doc, cell, column, value);
        continue;
      }
      if (!formula) clearCell(cell);
    }
    sheetData.appendChild(row);
  });

  const dimension = doc.getElementsByTagNameNS(XML_NS, 'dimension')[0];
  if (dimension) dimension.setAttribute('ref', `A1:BB${Math.max(FIRST_DATA_ROW, FIRST_DATA_ROW + assets.length - 1)}`);
  zip.file(modelBSheet.path, new XMLSerializer().serializeToString(doc));
  zip.file('xl/workbook.xml', forceRecalculation(workbookXml));
  if (zip.file('xl/calcChain.xml')) zip.remove('xl/calcChain.xml');

  const blob = await zip.generateAsync({
    type: 'blob',
    mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    compression: 'DEFLATE',
    compressionOptions: { level: 6 },
  });

  const incomplete = assets.filter((asset) => {
    const values = modelBValuesFromAsset(asset);
    return MODEL_B_FIELDS.some((field) => field.classification === 'mandatory' && !String(values[field.column] ?? '').trim());
  }).length;
  const warnings = incomplete
    ? [`تم تصدير جميع السجلات، ويوجد ${incomplete} أصلًا يحتوي حقول نموذج ب إلزامية غير مكتملة ويحتاج مراجعة قبل التسليم النهائي.`]
    : [];

  return {
    blob,
    exportedCount: assets.length,
    skippedCount: 0,
    sheets: [{ kind: 'fixed_asset', label: `سجل الأصول الثابتة — ${MODEL_B_VERSION}`, sheetName: modelBSheet.name, exportedCount: assets.length }],
    warnings,
  };
};

export async function buildOfficialAssetExcel(templateBuffer: ArrayBuffer, assets: AssetRecord[]): Promise<OfficialAssetExcelExportResult> {
  const modelB = await buildModelBExcel(templateBuffer, assets);
  if (modelB) return modelB;
  return buildLegacyOfficialAssetExcel(templateBuffer, assets);
}
