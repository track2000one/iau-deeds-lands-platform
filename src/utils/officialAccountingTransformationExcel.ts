import JSZip from 'jszip';
import type { AccountingTransformationRecord } from '../types/accountingTransformation';
import { ACCOUNTING_FIELDS, type AccountingRecordType as LegacyRecordType } from '../app/config/accountingTransformationFields';
import { MODEL_B_FIELDS, MODEL_B_SHEET_NAME } from '../app/config/fixedAssetModelB';

const XML_NS = 'http://schemas.openxmlformats.org/spreadsheetml/2006/main';
const REL_NS = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships';
const PKG_REL_NS = 'http://schemas.openxmlformats.org/package/2006/relationships';
const MODEL_B_FIRST_DATA_ROW = 5;

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
const workbookSheets = (workbookXml: string, relsXml: string): SheetInfo[] => {
  const parser = new DOMParser(); const wb = parser.parseFromString(workbookXml, 'application/xml'); const rels = parser.parseFromString(relsXml, 'application/xml');
  const relationships = Array.from(rels.getElementsByTagNameNS(PKG_REL_NS, 'Relationship'));
  return Array.from(wb.getElementsByTagNameNS(XML_NS, 'sheet')).map((sheet) => {
    const id = sheet.getAttributeNS(REL_NS, 'id') || sheet.getAttribute('r:id') || '';
    const rel = relationships.find((item) => item.getAttribute('Id') === id); const target = rel?.getAttribute('Target') || '';
    return { name: sheet.getAttribute('name') || '', path: target.startsWith('/') ? target.slice(1) : `xl/${target.replace(/^\.\//, '')}` };
  }).filter((x) => x.path);
};

const findLegacySheet = (sheets: SheetInfo[], type: LegacyRecordType) => sheets.find((sheet) => {
  const n = normalize(sheet.name); return type === 'land' ? n.includes('الاراضي') || n.includes('land') : n.includes('المباني') || n.includes('building');
}) || null;

const fillLegacySheet = async (zip: JSZip, sheet: SheetInfo, items: AccountingTransformationRecord[], type: LegacyRecordType) => {
  const file = zip.file(sheet.path); if (!file) return 0;
  const parser = new DOMParser(); const serializer = new XMLSerializer(); const doc = parser.parseFromString(await file.async('string'), 'application/xml');
  const sheetData = doc.getElementsByTagNameNS(XML_NS, 'sheetData')[0]; if (!sheetData) return 0;
  const templateRow = rowElement(sheetData, 8) || Array.from(sheetData.children).find((child) => child.localName === 'row' && Number(child.getAttribute('r')) >= 8) as Element | undefined;
  if (!templateRow) throw new Error(`تعذر العثور على صف البيانات في ورقة ${sheet.name}`);
  const pristine = templateRow.cloneNode(true) as Element;
  Array.from(sheetData.children).forEach((child) => { if (child.localName === 'row' && Number(child.getAttribute('r')) >= 8) sheetData.removeChild(child); });
  items.forEach((item, index) => {
    const rowNumber = 8 + index; const row = cloneRow(pristine, rowNumber); sheetData.appendChild(row);
    ACCOUNTING_FIELDS[type].forEach((field) => setInline(doc, ensureCell(doc, row, field.c, rowNumber), text(item.payload?.[field.c])));
  });
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

const fillModelBSheet = async (zip: JSZip, sheet: SheetInfo, items: AccountingTransformationRecord[]) => {
  const file = zip.file(sheet.path); if (!file) return 0;
  const parser = new DOMParser(); const serializer = new XMLSerializer(); const doc = parser.parseFromString(await file.async('string'), 'application/xml');
  const sheetData = doc.getElementsByTagNameNS(XML_NS, 'sheetData')[0]; if (!sheetData) throw new Error('ورقة سجل الأصول لا تحتوي منطقة بيانات.');
  const templateRow = rowElement(sheetData, MODEL_B_FIRST_DATA_ROW);
  if (!templateRow) throw new Error('تعذر العثور على صف البيانات الأول في نموذج ب (الصف 5).');
  const pristine = templateRow.cloneNode(true) as Element;
  Array.from(sheetData.children).forEach((child) => { if (child.localName === 'row' && Number(child.getAttribute('r')) >= MODEL_B_FIRST_DATA_ROW) sheetData.removeChild(child); });
  const fixed = items.filter((item) => item.recordType === 'fixed_asset');
  fixed.forEach((item, index) => {
    const rowNumber = MODEL_B_FIRST_DATA_ROW + index;
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
  const dimension = doc.getElementsByTagNameNS(XML_NS, 'dimension')[0];
  if (dimension) dimension.setAttribute('ref', `A1:BB${Math.max(MODEL_B_FIRST_DATA_ROW, MODEL_B_FIRST_DATA_ROW + fixed.length - 1)}`);
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
  const modelBSheet = sheets.find((sheet) => normalize(sheet.name) === normalize(MODEL_B_SHEET_NAME));
  let exportedCount = 0;
  let mode: 'model_b' | 'legacy' = 'legacy';

  if (modelBSheet) {
    mode = 'model_b';
    exportedCount = await fillModelBSheet(zip, modelBSheet, items);
    if (!exportedCount && items.some((item) => item.recordType !== 'fixed_asset')) {
      throw new Error('القالب الرسمي هو نموذج ب، لكن السجلات المحددة ما زالت من مصادر Legacy. يجب ترحيلها/استيرادها إلى سجل الأصول الثابتة قبل إخراج نموذج ب النهائي.');
    }
  } else {
    const landSheet = findLegacySheet(sheets, 'land'); const buildingSheet = findLegacySheet(sheets, 'building');
    if (!landSheet && !buildingSheet) throw new Error('لم يتم العثور على ورقة «سجل الأصول» لنموذج ب ولا أوراق Legacy للأراضي/المباني في النموذج الرسمي.');
    if (landSheet) exportedCount += await fillLegacySheet(zip, landSheet, items.filter((x) => x.recordType === 'land'), 'land');
    if (buildingSheet) exportedCount += await fillLegacySheet(zip, buildingSheet, items.filter((x) => x.recordType === 'building'), 'building');
  }

  zip.file('xl/workbook.xml', forceRecalculation(workbookXml));
  if (zip.file('xl/calcChain.xml')) zip.remove('xl/calcChain.xml');
  const blob = await zip.generateAsync({ type: 'blob', mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', compression: 'DEFLATE', compressionOptions: { level: 6 } });
  return { blob, exportedCount, mode, skippedCount: Math.max(0, items.length - exportedCount) };
};
