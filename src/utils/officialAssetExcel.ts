import JSZip from 'jszip';
import type { AssetRecord } from '../types/asset';

const OFFICIAL_SHEET_NAME = 'هـ- الالات والمعدات';
const FIRST_DATA_ROW = 9;
const LAST_TEMPLATE_ROW = 500;

const MANUAL_GREEN_COLUMNS = [
  'B', 'C', 'F', 'G', 'J', 'K', 'N', 'Q', 'T', 'AA', 'AB', 'AE', 'AF', 'AG', 'AH',
  'AJ', 'AL', 'AM', 'AN', 'AO', 'AW', 'AX', 'BD', 'BE', 'BF', 'BG',
] as const;

const FORMULA_GREEN_COLUMNS = ['L', 'M', 'P', 'R', 'S', 'U', 'V', 'W'] as const;
const GREEN_COLUMNS = [...MANUAL_GREEN_COLUMNS, ...FORMULA_GREEN_COLUMNS] as const;

const XML_NS = 'http://schemas.openxmlformats.org/spreadsheetml/2006/main';
const REL_NS = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships';
const PKG_REL_NS = 'http://schemas.openxmlformats.org/package/2006/relationships';

const payloadOf = (asset: AssetRecord) => (asset.excelPayload || {}) as Record<string, unknown>;
const text = (value: unknown) => value === null || value === undefined ? '' : String(value).trim();
const first = (...values: unknown[]) => values.map(text).find(Boolean) || '';
const numberOrBlank = (value: unknown) => {
  if (value === null || value === undefined || value === '') return '';
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : '';
};

const normalizeHijriText = (value: unknown) => {
  const raw = text(value);
  if (!raw) return '';
  const match = raw.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
  if (!match) return raw;
  return `${match[1]}/${String(Number(match[2])).padStart(2, '0')}/${String(Number(match[3])).padStart(2, '0')}هـ`;
};

const excelSerial = (value: unknown) => {
  if (!value) return '';
  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) return '';
  const utc = Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
  return utc / 86400000 + 25569;
};

const dateValue = (value: unknown, dateType?: string | null) =>
  dateType === 'hijri' ? normalizeHijriText(value) : excelSerial(value);

const isPpeAsset = (asset: AssetRecord) => {
  const templateType = text(payloadOf(asset).templateType || 'ppe');
  return templateType === 'ppe';
};

const valueMap = (asset: AssetRecord): Record<string, string | number> => {
  const payload = payloadOf(asset);
  return {
    B: first(asset.entityName, asset.department),
    C: first(asset.entityCode),
    F: first(asset.assetDescription, asset.name),
    G: first(asset.cardNumber, asset.barcode, asset.itemNumber, asset.assetNumber),
    J: first(asset.responsibleDepartment, asset.department, asset.entityName),
    K: first(asset.classification1),
    N: first(asset.classification2),
    Q: first(asset.classification3),
    T: first(asset.accountingGroup),
    AA: numberOrBlank(asset.remainingLife),
    AB: numberOrBlank(asset.usefulLife),
    AE: first(asset.region),
    AF: first(asset.city),
    AG: first(asset.buildingNumber, asset.building),
    AH: first(asset.coordinates),
    AJ: dateValue(asset.serviceDate, asset.serviceDateType),
    AL: numberOrBlank(asset.acquisitionCost ?? asset.purchaseValue),
    AM: first(asset.supportingCostDocument, payload.supportingDocumentType),
    AN: first(asset.archiveDocumentNumber, payload.supportingDocumentNumber),
    AO: first(asset.manufacturer, asset.brand),
    AW: first(asset.technicalCondition),
    AX: dateValue(asset.lastInventoryDate, asset.lastInventoryDateType),
    BD: first(asset.unitOfMeasure),
    BE: numberOrBlank(asset.quantity ?? 1),
    BF: first(asset.floor),
    BG: first(asset.room),
  };
};

const formulaMap = (row: number): Record<string, string> => ({
  L: `IFERROR(VLOOKUP(K${row},'AREN VL'!A:B,2,0),\"\")`,
  M: `IFERROR(VLOOKUP(K${row},'Classes and codes'!A:B,2,FALSE),\"\")`,
  P: `IFERROR(VLOOKUP(N${row},'Classes and codes'!D:E,2,FALSE),\"\")`,
  R: `IFERROR(VLOOKUP(Q${row},'AREN VL'!G:H,2,0),\"\")`,
  S: `IFERROR(VLOOKUP(Q${row},'Classes and codes'!G:H,2,FALSE),\"\")`,
  U: `IFERROR(VLOOKUP(T${row},'AREN VL'!J:K,2,0),\"\")`,
  V: `IFERROR(VLOOKUP(T${row},'Classes and codes'!K:L,2,FALSE),\"\")`,
  W: `CONCATENATE(M${row},P${row},S${row},V${row})`,
});

const directChild = (parent: Element, localName: string) =>
  Array.from(parent.children).find((child) => child.localName === localName) || null;

const rowElement = (sheetData: Element, row: number) =>
  Array.from(sheetData.children).find((child) => child.localName === 'row' && child.getAttribute('r') === String(row)) || null;

const cellElement = (row: Element, ref: string) =>
  Array.from(row.children).find((child) => child.localName === 'c' && child.getAttribute('r') === ref) || null;

const clearCell = (cell: Element) => {
  Array.from(cell.children).forEach((child) => cell.removeChild(child));
  cell.removeAttribute('t');
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

const setInlineText = (doc: XMLDocument, cell: Element, value: string) => {
  clearCell(cell);
  if (!value) return;
  cell.setAttribute('t', 'inlineStr');
  const is = doc.createElementNS(XML_NS, 'is');
  const t = doc.createElementNS(XML_NS, 't');
  if (/^\s|\s$/.test(value)) t.setAttribute('xml:space', 'preserve');
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

const setValue = (doc: XMLDocument, cell: Element, value: string | number) => {
  if (typeof value === 'number' && Number.isFinite(value)) setNumber(doc, cell, value);
  else setInlineText(doc, cell, text(value));
};

const setFormula = (doc: XMLDocument, cell: Element, formula: string) => {
  clearCell(cell);
  const f = doc.createElementNS(XML_NS, 'f');
  f.textContent = formula;
  cell.appendChild(f);
};

const resolveWorksheetPath = (workbookXml: string, relsXml: string, sheetName: string) => {
  const parser = new DOMParser();
  const workbookDoc = parser.parseFromString(workbookXml, 'application/xml');
  const relsDoc = parser.parseFromString(relsXml, 'application/xml');
  const sheets = Array.from(workbookDoc.getElementsByTagNameNS(XML_NS, 'sheet'));
  const sheet = sheets.find((item) => item.getAttribute('name')?.trim() === sheetName.trim());
  if (!sheet) throw new Error(`لم يتم العثور على ورقة ${sheetName} داخل القالب الرسمي.`);
  const relationshipId = sheet.getAttributeNS(REL_NS, 'id') || sheet.getAttribute('r:id');
  if (!relationshipId) throw new Error('تعذر تحديد علاقة ورقة Excel الرسمية.');
  const relationships = Array.from(relsDoc.getElementsByTagNameNS(PKG_REL_NS, 'Relationship'));
  const relationship = relationships.find((item) => item.getAttribute('Id') === relationshipId);
  if (!relationship) throw new Error('تعذر تحديد ملف ورقة Excel الرسمية.');
  const target = relationship.getAttribute('Target') || '';
  if (!target) throw new Error('مسار ورقة Excel الرسمية غير صالح.');
  return target.startsWith('/') ? target.slice(1) : `xl/${target.replace(/^\.\//, '')}`;
};

const forceWorkbookRecalculation = (workbookXml: string) => {
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

export type OfficialAssetExcelExportResult = {
  blob: Blob;
  exportedCount: number;
  skippedCount: number;
};

export async function buildOfficialAssetExcel(
  templateBuffer: ArrayBuffer,
  assets: AssetRecord[]
): Promise<OfficialAssetExcelExportResult> {
  const zip = await JSZip.loadAsync(templateBuffer);
  const workbookFile = zip.file('xl/workbook.xml');
  const relsFile = zip.file('xl/_rels/workbook.xml.rels');
  if (!workbookFile || !relsFile) throw new Error('قالب Excel غير صالح أو لا يحتوي بنية Workbook كاملة.');

  const workbookXml = await workbookFile.async('string');
  const relsXml = await relsFile.async('string');
  const worksheetPath = resolveWorksheetPath(workbookXml, relsXml, OFFICIAL_SHEET_NAME);
  const worksheetFile = zip.file(worksheetPath);
  if (!worksheetFile) throw new Error('تعذر قراءة ورقة الآلات والمعدات من القالب الرسمي.');

  const parser = new DOMParser();
  const doc = parser.parseFromString(await worksheetFile.async('string'), 'application/xml');
  if (doc.getElementsByTagName('parsererror').length) throw new Error('تعذر تحليل ورقة Excel الرسمية.');
  const sheetData = doc.getElementsByTagNameNS(XML_NS, 'sheetData')[0];
  if (!sheetData) throw new Error('القالب الرسمي لا يحتوي على منطقة بيانات صالحة.');

  const ppeAssets = assets.filter(isPpeAsset);
  const availableRows = LAST_TEMPLATE_ROW - FIRST_DATA_ROW + 1;
  if (ppeAssets.length > availableRows) {
    throw new Error(`القالب الرسمي يدعم حتى ${availableRows} سجلًا في ورقة الآلات والمعدات. عدد السجلات المطلوب ${ppeAssets.length}.`);
  }

  for (let rowNumber = FIRST_DATA_ROW; rowNumber <= LAST_TEMPLATE_ROW; rowNumber += 1) {
    const row = rowElement(sheetData, rowNumber);
    if (!row) continue;
    for (const column of GREEN_COLUMNS) {
      const cell = cellElement(row, `${column}${rowNumber}`);
      if (cell) clearCell(cell);
    }
  }

  ppeAssets.forEach((asset, index) => {
    const rowNumber = FIRST_DATA_ROW + index;
    const row = rowElement(sheetData, rowNumber);
    if (!row) throw new Error(`الصف ${rowNumber} غير موجود في القالب الرسمي.`);
    const values = valueMap(asset);
    for (const column of MANUAL_GREEN_COLUMNS) {
      const cell = ensureCell(doc, row, column, rowNumber);
      setValue(doc, cell, values[column] ?? '');
    }
    const formulas = formulaMap(rowNumber);
    for (const column of FORMULA_GREEN_COLUMNS) {
      const cell = ensureCell(doc, row, column, rowNumber);
      setFormula(doc, cell, formulas[column]);
    }
  });

  zip.file(worksheetPath, new XMLSerializer().serializeToString(doc));
  zip.file('xl/workbook.xml', forceWorkbookRecalculation(workbookXml));
  if (zip.file('xl/calcChain.xml')) zip.remove('xl/calcChain.xml');

  const output = await zip.generateAsync({
    type: 'blob',
    mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    compression: 'DEFLATE',
    compressionOptions: { level: 6 },
  });

  return {
    blob: output,
    exportedCount: ppeAssets.length,
    skippedCount: assets.length - ppeAssets.length,
  };
}
