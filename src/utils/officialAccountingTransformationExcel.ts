import JSZip from 'jszip';
import type { AccountingTransformationRecord } from '../types/accountingTransformation';
import { ACCOUNTING_FIELDS, excelColumnToIndex, type AccountingRecordType } from '../app/config/accountingTransformationFields';

const XML_NS = 'http://schemas.openxmlformats.org/spreadsheetml/2006/main';
const REL_NS = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships';
const PKG_REL_NS = 'http://schemas.openxmlformats.org/package/2006/relationships';

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
const ensureCell = (doc: XMLDocument, row: Element, column: string, rowNumber: number) => {
  const ref = `${column}${rowNumber}`; let cell = cellElement(row, ref); if (cell) return cell;
  cell = doc.createElementNS(XML_NS, 'c'); cell.setAttribute('r', ref); row.appendChild(cell); return cell;
};
const cloneRow = (source: Element, rowNumber: number) => {
  const cloned = source.cloneNode(true) as Element; cloned.setAttribute('r', String(rowNumber));
  Array.from(cloned.children).forEach((child) => { if (child.localName !== 'c') return; const c = colFromRef(child.getAttribute('r') || ''); if (c) child.setAttribute('r', `${c}${rowNumber}`); });
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
const findSheet = (sheets: SheetInfo[], type: AccountingRecordType) => sheets.find((sheet) => {
  const n = normalize(sheet.name); return type === 'land' ? n.includes('الاراضي') || n.includes('land') : n.includes('المباني') || n.includes('building');
}) || null;

const fillSheet = async (zip: JSZip, sheet: SheetInfo, items: AccountingTransformationRecord[], type: AccountingRecordType) => {
  const file = zip.file(sheet.path); if (!file) return;
  const parser = new DOMParser(); const serializer = new XMLSerializer(); const doc = parser.parseFromString(await file.async('string'), 'application/xml');
  const sheetData = doc.getElementsByTagNameNS(XML_NS, 'sheetData')[0]; if (!sheetData) return;
  const templateRow = rowElement(sheetData, 8) || Array.from(sheetData.children).find((child) => child.localName === 'row' && Number(child.getAttribute('r')) >= 8) as Element | undefined;
  if (!templateRow) throw new Error(`تعذر العثور على صف البيانات في ورقة ${sheet.name}`);
  Array.from(sheetData.children).forEach((child) => { if (child.localName === 'row' && Number(child.getAttribute('r')) >= 8) sheetData.removeChild(child); });
  items.forEach((item, index) => {
    const rowNumber = 8 + index; const row = cloneRow(templateRow, rowNumber); sheetData.appendChild(row);
    ACCOUNTING_FIELDS[type].forEach((field) => setInline(doc, ensureCell(doc, row, field.c, rowNumber), text(item.payload?.[field.c])));
  });
  const dimension = doc.getElementsByTagNameNS(XML_NS, 'dimension')[0];
  if (dimension) { const lastCol = ACCOUNTING_FIELDS[type][ACCOUNTING_FIELDS[type].length - 1]?.c || 'A'; dimension.setAttribute('ref', `A1:${lastCol}${Math.max(8, 7 + items.length)}`); }
  zip.file(sheet.path, serializer.serializeToString(doc));
};

export const buildOfficialAccountingTransformationExcel = async (templateBuffer: ArrayBuffer, items: AccountingTransformationRecord[]) => {
  const zip = await JSZip.loadAsync(templateBuffer); const workbookXml = await zip.file('xl/workbook.xml')?.async('string'); const relsXml = await zip.file('xl/_rels/workbook.xml.rels')?.async('string');
  if (!workbookXml || !relsXml) throw new Error('ملف النموذج الرسمي غير صالح.');
  const sheets = workbookSheets(workbookXml, relsXml); const landSheet = findSheet(sheets, 'land'); const buildingSheet = findSheet(sheets, 'building');
  if (!landSheet && !buildingSheet) throw new Error('لم يتم العثور على ورقتي الأراضي أو المباني في النموذج الرسمي.');
  if (landSheet) await fillSheet(zip, landSheet, items.filter((x) => x.recordType === 'land'), 'land');
  if (buildingSheet) await fillSheet(zip, buildingSheet, items.filter((x) => x.recordType === 'building'), 'building');
  const blob = await zip.generateAsync({ type: 'blob', mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  return { blob, exportedCount: items.length };
};
