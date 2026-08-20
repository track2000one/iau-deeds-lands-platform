import JSZip from 'jszip';
import type { AssetRecord } from '../types/asset';

const XML_NS = 'http://schemas.openxmlformats.org/spreadsheetml/2006/main';
const REL_NS = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships';
const PKG_REL_NS = 'http://schemas.openxmlformats.org/package/2006/relationships';

const MANUAL_GREEN_COLUMNS = [
  'B', 'C', 'F', 'G', 'J', 'K', 'N', 'Q', 'T', 'AA', 'AB', 'AE', 'AF', 'AG', 'AH',
  'AJ', 'AL', 'AM', 'AN', 'AO', 'AW', 'AX', 'BD', 'BE', 'BF', 'BG',
] as const;
const FORMULA_GREEN_COLUMNS = ['L', 'M', 'P', 'R', 'S', 'U', 'V', 'W'] as const;

const text = (value: unknown) => value === null || value === undefined ? '' : String(value).trim();
const normalize = (value: unknown) => text(value)
  .replace(/[ـ]/g, '')
  .replace(/[أإآ]/g, 'ا')
  .replace(/ة/g, 'ه')
  .replace(/ى/g, 'ي')
  .replace(/[–—-]/g, ' ')
  .replace(/\s+/g, ' ')
  .trim()
  .toLowerCase();

const payloadOf = (asset: AssetRecord) => (asset.excelPayload || {}) as Record<string, unknown>;
const first = (...values: unknown[]) => values.map(text).find(Boolean) || '';
const numberOrBlank = (value: unknown) => {
  if (value === null || value === undefined || value === '') return '';
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : '';
};

const excelSerial = (value: unknown) => {
  if (!value) return '';
  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) return '';
  const utc = Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
  return utc / 86400000 + 25569;
};

const normalizeHijriText = (value: unknown) => {
  const raw = text(value);
  if (!raw) return '';
  const match = raw.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
  if (!match) return raw;
  return `${match[1]}/${String(Number(match[2])).padStart(2, '0')}/${String(Number(match[3])).padStart(2, '0')}هـ`;
};

const dateValue = (value: unknown, dateType?: string | null) =>
  dateType === 'hijri' ? normalizeHijriText(value) : excelSerial(value);

type ExportKind = 'land' | 'building' | 'lease_building_improvement' | 'lease_land_improvement' | 'infrastructure' | 'equipment' | 'vehicle' | 'furniture' | 'plant_animal' | 'intangible';

type SheetConfig = { kind: ExportKind; label: string; sheetKeywords: string[] };
const SHEET_CONFIGS: SheetConfig[] = [
  { kind: 'land', label: 'الأراضي', sheetKeywords: ['الاراضي', 'land'] },
  { kind: 'building', label: 'المباني', sheetKeywords: ['building', 'المباني'] },
  { kind: 'lease_building_improvement', label: 'تحسينات المباني المستأجرة', sheetKeywords: ['تحسينات المباني المستاجره'] },
  { kind: 'lease_land_improvement', label: 'تحسينات الأراضي المستأجرة', sheetKeywords: ['تحسينات الاراضي المستاجره'] },
  { kind: 'infrastructure', label: 'البنية التحتية', sheetKeywords: ['البنيه التحتيه', 'infrastructure'] },
  { kind: 'equipment', label: 'الآلات والمعدات', sheetKeywords: ['الالات والمعدات', 'ppe'] },
  { kind: 'vehicle', label: 'أصول النقل العام', sheetKeywords: ['اصول النقل العام', 'transport'] },
  { kind: 'furniture', label: 'الأثاث', sheetKeywords: ['الاثاث', 'furniture'] },
  { kind: 'plant_animal', label: 'أصول النباتات والحيوانات', sheetKeywords: ['النباتات والحيوانات'] },
  { kind: 'intangible', label: 'الأصول غير الملموسة', sheetKeywords: ['غير ملموس', 'intangible'] },
];

const kindOf = (asset: AssetRecord): ExportKind | null => {
  const payload = payloadOf(asset);
  const raw = normalize(payload.templateType || asset.category || payload.__sourceSheet || '');
  if (/equipment|ppe|الات ومعدات|الات والمعدات/.test(raw)) return 'equipment';
  if (/furniture|اثاث/.test(raw)) return 'furniture';
  if (/vehicle|transport|نقل عام|مركبات/.test(raw)) return 'vehicle';
  if (/infrastructure|بنيه تحتيه/.test(raw)) return 'infrastructure';
  if (/intangible|غير ملموس/.test(raw)) return 'intangible';
  if (/land|اراضي/.test(raw)) return 'land';
  if (/building|مباني/.test(raw)) return 'building';
  if (/plant|animal|نبات|حيوان/.test(raw)) return 'plant_animal';
  return null;
};

const equipmentValueMap = (asset: AssetRecord): Record<string, string | number> => {
  const payload = payloadOf(asset);
  return {
    B: first(asset.entityName, asset.department), C: first(asset.entityCode), F: first(asset.assetDescription, asset.name),
    G: first(asset.cardNumber, asset.barcode, asset.itemNumber, asset.assetNumber), J: first(asset.responsibleDepartment, asset.department, asset.entityName),
    K: first(asset.classification1), N: first(asset.classification2), Q: first(asset.classification3), T: first(asset.accountingGroup),
    AA: numberOrBlank(asset.remainingLife), AB: numberOrBlank(asset.usefulLife), AE: first(asset.region), AF: first(asset.city),
    AG: first(asset.buildingNumber, asset.building), AH: first(asset.coordinates), AJ: dateValue(asset.serviceDate, asset.serviceDateType),
    AL: numberOrBlank(asset.acquisitionCost ?? asset.purchaseValue), AM: first(asset.supportingCostDocument, payload.supportingDocumentType),
    AN: first(asset.archiveDocumentNumber, payload.supportingDocumentNumber), AO: first(asset.manufacturer, asset.brand),
    AW: first(asset.technicalCondition), AX: dateValue(asset.lastInventoryDate, asset.lastInventoryDateType), BD: first(asset.unitOfMeasure),
    BE: numberOrBlank(asset.quantity ?? 1), BF: first(asset.floor), BG: first(asset.room),
  };
};

const equipmentFormulaMap = (row: number): Record<string, string> => ({
  L: `IFERROR(VLOOKUP(K${row},'AREN VL'!A:B,2,0),\"\")`,
  M: `IFERROR(VLOOKUP(K${row},'Classes and codes'!A:B,2,FALSE),\"\")`,
  P: `IFERROR(VLOOKUP(N${row},'Classes and codes'!D:E,2,FALSE),\"\")`,
  R: `IFERROR(VLOOKUP(Q${row},'AREN VL'!G:H,2,0),\"\")`,
  S: `IFERROR(VLOOKUP(Q${row},'Classes and codes'!G:H,2,FALSE),\"\")`,
  U: `IFERROR(VLOOKUP(T${row},'AREN VL'!J:K,2,0),\"\")`,
  V: `IFERROR(VLOOKUP(T${row},'Classes and codes'!K:L,2,FALSE),\"\")`,
  W: `CONCATENATE(M${row},P${row},S${row},V${row})`,
});

const directChild = (parent: Element, localName: string) => Array.from(parent.children).find((child) => child.localName === localName) || null;
const rowElement = (sheetData: Element, row: number) => Array.from(sheetData.children).find((child) => child.localName === 'row' && child.getAttribute('r') === String(row)) || null;
const cellElement = (row: Element, ref: string) => Array.from(row.children).find((child) => child.localName === 'c' && child.getAttribute('r') === ref) || null;
const columnFromRef = (ref: string) => (ref.match(/^[A-Z]+/) || [''])[0];
const clearCell = (cell: Element) => { Array.from(cell.children).forEach((child) => cell.removeChild(child)); cell.removeAttribute('t'); };
const setInlineText = (doc: XMLDocument, cell: Element, value: string) => { clearCell(cell); if (!value) return; cell.setAttribute('t', 'inlineStr'); const is = doc.createElementNS(XML_NS, 'is'); const t = doc.createElementNS(XML_NS, 't'); if (/^\s|\s$/.test(value)) t.setAttribute('xml:space', 'preserve'); t.textContent = value; is.appendChild(t); cell.appendChild(is); };
const setNumber = (doc: XMLDocument, cell: Element, value: number) => { clearCell(cell); const v = doc.createElementNS(XML_NS, 'v'); v.textContent = String(value); cell.appendChild(v); };
const setValue = (doc: XMLDocument, cell: Element, value: unknown) => { if (typeof value === 'number' && Number.isFinite(value)) setNumber(doc, cell, value); else setInlineText(doc, cell, text(value)); };
const setFormula = (doc: XMLDocument, cell: Element, formula: string) => { clearCell(cell); const f = doc.createElementNS(XML_NS, 'f'); f.textContent = formula; cell.appendChild(f); };
const ensureCell = (doc: XMLDocument, row: Element, column: string, rowNumber: number) => { const ref = `${column}${rowNumber}`; let cell = cellElement(row, ref); if (cell) return cell; cell = doc.createElementNS(XML_NS, 'c'); cell.setAttribute('r', ref); row.appendChild(cell); return cell; };
const getCellText = (cell: Element, sharedStrings: string[]) => { const type = cell.getAttribute('t'); if (type === 'inlineStr') return Array.from(cell.getElementsByTagNameNS(XML_NS, 't')).map((item) => item.textContent || '').join(''); const v = directChild(cell, 'v')?.textContent || ''; if (type === 's') return sharedStrings[Number(v)] || ''; return v; };
const cloneTemplateRow = (doc: XMLDocument, sourceRow: Element, rowNumber: number) => { const cloned = sourceRow.cloneNode(true) as Element; cloned.setAttribute('r', String(rowNumber)); Array.from(cloned.children).forEach((child) => { if (child.localName !== 'c') return; const ref = child.getAttribute('r') || ''; const column = columnFromRef(ref); if (column) child.setAttribute('r', `${column}${rowNumber}`); const formula = directChild(child, 'f'); if (formula?.textContent) { const sourceNumber = Number(sourceRow.getAttribute('r') || rowNumber); formula.textContent = formula.textContent.replace(new RegExp(`(?<=[A-Z])${sourceNumber}(?!\\d)`, 'g'), String(rowNumber)); } }); return cloned; };
const ensureRow = (doc: XMLDocument, sheetData: Element, templateRow: Element, rowNumber: number) => { const existing = rowElement(sheetData, rowNumber); if (existing) return existing; const row = cloneTemplateRow(doc, templateRow, rowNumber); const laterRow = Array.from(sheetData.children).find((child) => child.localName === 'row' && Number(child.getAttribute('r')) > rowNumber); if (laterRow) sheetData.insertBefore(row, laterRow); else sheetData.appendChild(row); return row; };

const parseSharedStrings = async (zip: JSZip) => { const file = zip.file('xl/sharedStrings.xml'); if (!file) return [] as string[]; const parser = new DOMParser(); const doc = parser.parseFromString(await file.async('string'), 'application/xml'); return Array.from(doc.getElementsByTagNameNS(XML_NS, 'si')).map((si) => Array.from(si.getElementsByTagNameNS(XML_NS, 't')).map((t) => t.textContent || '').join('')); };
type WorkbookSheet = { name: string; relationshipId: string; path: string };
const workbookSheets = (workbookXml: string, relsXml: string): WorkbookSheet[] => { const parser = new DOMParser(); const workbookDoc = parser.parseFromString(workbookXml, 'application/xml'); const relsDoc = parser.parseFromString(relsXml, 'application/xml'); const relationships = Array.from(relsDoc.getElementsByTagNameNS(PKG_REL_NS, 'Relationship')); return Array.from(workbookDoc.getElementsByTagNameNS(XML_NS, 'sheet')).map((sheet) => { const name = sheet.getAttribute('name') || ''; const relationshipId = sheet.getAttributeNS(REL_NS, 'id') || sheet.getAttribute('r:id') || ''; const relationship = relationships.find((item) => item.getAttribute('Id') === relationshipId); const target = relationship?.getAttribute('Target') || ''; return { name, relationshipId, path: target.startsWith('/') ? target.slice(1) : `xl/${target.replace(/^\.\//, '')}` }; }).filter((sheet) => sheet.path); };
const findSheet = (sheets: WorkbookSheet[], config: SheetConfig) => { const keywords = config.sheetKeywords.map(normalize); return sheets.find((sheet) => { const name = normalize(sheet.name); return keywords.some((keyword) => name.includes(keyword)); }) || null; };
const findHeaderRow = (sheetData: Element, sharedStrings: string[], payloadKeys: Set<string>) => { const normalizedKeys = new Set(Array.from(payloadKeys).map(normalize)); let best: { rowNumber: number; score: number; columns: Map<string, string> } | null = null; for (const row of Array.from(sheetData.children).filter((child) => child.localName === 'row').slice(0, 25)) { const rowNumber = Number(row.getAttribute('r') || 0); if (!rowNumber) continue; const columns = new Map<string, string>(); let score = 0; for (const cell of Array.from(row.children).filter((child) => child.localName === 'c')) { const header = getCellText(cell, sharedStrings).trim(); if (!header) continue; const normalizedHeader = normalize(header); if (!normalizedKeys.has(normalizedHeader)) continue; const column = columnFromRef(cell.getAttribute('r') || ''); if (!column) continue; const payloadKey = Array.from(payloadKeys).find((key) => normalize(key) === normalizedHeader) || header; columns.set(column, payloadKey); score += 1; } if (!best || score > best.score) best = { rowNumber, score, columns }; } return best && best.score > 0 ? best : null; };

const fallbackPayload = (asset: AssetRecord): Record<string, unknown> => ({
  'اسم الجهة': first(asset.entityName, asset.department), 'رمز الجهة': asset.entityCode, 'وصف الأصل': first(asset.assetDescription, asset.name),
  'رقم البطاقة': first(asset.cardNumber, asset.barcode, asset.itemNumber, asset.assetNumber), 'القسم/الإدارة المسؤولة أو الشخص المسؤول': first(asset.responsibleDepartment, asset.department),
  'المنطقة': asset.region, 'المدينة': asset.city, 'رقم المبنى': first(asset.buildingNumber, asset.building), 'الإحداثيات': asset.coordinates,
  'العمر المتبقي': asset.remainingLife, 'العمر الإنتاجي': asset.usefulLife, 'تكلفة الاقتناء': asset.acquisitionCost ?? asset.purchaseValue,
  'الوثائق الداعمة لتكلفة الاقتناء': asset.supportingCostDocument, 'رقم أرشفة وثيقة إثبات الأصل': asset.archiveDocumentNumber,
  'المصنع': first(asset.manufacturer, asset.brand), 'حالة الأصل': asset.technicalCondition, 'وحدة القياس': asset.unitOfMeasure,
  'العدد': asset.quantity, 'رقم الدور': asset.floor, 'رقم الغرفة/ المكتب': asset.room,
});
const effectivePayload = (asset: AssetRecord) => ({ ...fallbackPayload(asset), ...payloadOf(asset) });

const writeGenericSheet = async (zip: JSZip, sheet: WorkbookSheet, assets: AssetRecord[], sharedStrings: string[]) => {
  const file = zip.file(sheet.path); if (!file || !assets.length) return { exported: 0, warning: '' }; const parser = new DOMParser(); const doc = parser.parseFromString(await file.async('string'), 'application/xml'); if (doc.getElementsByTagName('parsererror').length) throw new Error(`تعذر تحليل ورقة ${sheet.name}.`); const sheetData = doc.getElementsByTagNameNS(XML_NS, 'sheetData')[0]; if (!sheetData) throw new Error(`ورقة ${sheet.name} لا تحتوي منطقة بيانات صالحة.`);
  const payloadKeys = new Set<string>(); assets.forEach((asset) => Object.keys(effectivePayload(asset)).filter((key) => !key.startsWith('__')).forEach((key) => payloadKeys.add(key))); const header = findHeaderRow(sheetData, sharedStrings, payloadKeys); if (!header) return { exported: 0, warning: `تعذر تحديد عناوين الأعمدة في ورقة ${sheet.name}.` };
  const firstDataRow = header.rowNumber + 1; const existingRows = Array.from(sheetData.children).filter((child) => child.localName === 'row' && Number(child.getAttribute('r')) >= firstDataRow); const templateRow = existingRows[0] || rowElement(sheetData, header.rowNumber); if (!templateRow) throw new Error(`تعذر تحديد صف القالب في ورقة ${sheet.name}.`); const writableColumns = Array.from(header.columns.keys()); existingRows.forEach((row) => { const rowNumber = Number(row.getAttribute('r') || 0); writableColumns.forEach((column) => { const cell = cellElement(row, `${column}${rowNumber}`); if (cell) clearCell(cell); }); });
  assets.forEach((asset, index) => { const rowNumber = firstDataRow + index; const row = ensureRow(doc, sheetData, templateRow, rowNumber); const payload = effectivePayload(asset); header.columns.forEach((payloadKey, column) => { const cell = ensureCell(doc, row, column, rowNumber); setValue(doc, cell, payload[payloadKey] ?? ''); }); });
  const dimension = doc.getElementsByTagNameNS(XML_NS, 'dimension')[0]; if (dimension) { const ref = dimension.getAttribute('ref') || ''; const endColumn = (ref.split(':').pop()?.match(/^[A-Z]+/) || [''])[0]; if (endColumn) dimension.setAttribute('ref', `A1:${endColumn}${Math.max(firstDataRow + assets.length - 1, firstDataRow)}`); }
  zip.file(sheet.path, new XMLSerializer().serializeToString(doc)); return { exported: assets.length, warning: '' };
};

const writeEquipmentSheet = async (zip: JSZip, sheet: WorkbookSheet, assets: AssetRecord[]) => {
  const file = zip.file(sheet.path); if (!file || !assets.length) return { exported: 0, warning: '' }; const parser = new DOMParser(); const doc = parser.parseFromString(await file.async('string'), 'application/xml'); const sheetData = doc.getElementsByTagNameNS(XML_NS, 'sheetData')[0]; if (!sheetData) throw new Error(`ورقة ${sheet.name} لا تحتوي منطقة بيانات صالحة.`);
  const FIRST_DATA_ROW = 9; const existingRows = Array.from(sheetData.children).filter((child) => child.localName === 'row' && Number(child.getAttribute('r')) >= FIRST_DATA_ROW); const templateRow = existingRows[0] || rowElement(sheetData, 8); if (!templateRow) throw new Error('تعذر تحديد صف قالب الآلات والمعدات.');
  existingRows.forEach((row) => { const rowNumber = Number(row.getAttribute('r') || 0); [...MANUAL_GREEN_COLUMNS, ...FORMULA_GREEN_COLUMNS].forEach((column) => { const cell = cellElement(row, `${column}${rowNumber}`); if (cell) clearCell(cell); }); });
  assets.forEach((asset, index) => { const rowNumber = FIRST_DATA_ROW + index; const row = ensureRow(doc, sheetData, templateRow, rowNumber); const values = equipmentValueMap(asset); MANUAL_GREEN_COLUMNS.forEach((column) => { const cell = ensureCell(doc, row, column, rowNumber); setValue(doc, cell, values[column] ?? ''); }); const formulas = equipmentFormulaMap(rowNumber); FORMULA_GREEN_COLUMNS.forEach((column) => { const cell = ensureCell(doc, row, column, rowNumber); setFormula(doc, cell, formulas[column]); }); });
  zip.file(sheet.path, new XMLSerializer().serializeToString(doc)); return { exported: assets.length, warning: '' };
};

const forceWorkbookRecalculation = (workbookXml: string) => { const parser = new DOMParser(); const doc = parser.parseFromString(workbookXml, 'application/xml'); let calcPr = doc.getElementsByTagNameNS(XML_NS, 'calcPr')[0]; if (!calcPr) { calcPr = doc.createElementNS(XML_NS, 'calcPr'); doc.documentElement.appendChild(calcPr); } calcPr.setAttribute('calcMode', 'auto'); calcPr.setAttribute('fullCalcOnLoad', '1'); calcPr.setAttribute('forceFullCalc', '1'); return new XMLSerializer().serializeToString(doc); };

export type OfficialAssetExcelSheetResult = { kind: string; label: string; sheetName: string; exportedCount: number };
export type OfficialAssetExcelExportResult = { blob: Blob; exportedCount: number; skippedCount: number; sheets: OfficialAssetExcelSheetResult[]; warnings: string[] };

export async function buildOfficialAssetExcel(templateBuffer: ArrayBuffer, assets: AssetRecord[]): Promise<OfficialAssetExcelExportResult> {
  const zip = await JSZip.loadAsync(templateBuffer); const workbookFile = zip.file('xl/workbook.xml'); const relsFile = zip.file('xl/_rels/workbook.xml.rels'); if (!workbookFile || !relsFile) throw new Error('قالب Excel غير صالح أو لا يحتوي بنية Workbook كاملة.');
  const workbookXml = await workbookFile.async('string'); const relsXml = await relsFile.async('string'); const sheets = workbookSheets(workbookXml, relsXml); const sharedStrings = await parseSharedStrings(zip);
  const grouped = new Map<ExportKind, AssetRecord[]>(); let skippedCount = 0; assets.forEach((asset) => { const kind = kindOf(asset); if (!kind) { skippedCount += 1; return; } const list = grouped.get(kind) || []; list.push(asset); grouped.set(kind, list); });
  const sheetResults: OfficialAssetExcelSheetResult[] = []; const warnings: string[] = []; let exportedCount = 0;
  for (const config of SHEET_CONFIGS) { const records = grouped.get(config.kind) || []; if (!records.length) continue; const sheet = findSheet(sheets, config); if (!sheet) { skippedCount += records.length; warnings.push(`لم يتم العثور على ورقة ${config.label} داخل القالب الرسمي، لذلك تم تجاوز ${records.length} سجلًا.`); continue; } const result = config.kind === 'equipment' ? await writeEquipmentSheet(zip, sheet, records) : await writeGenericSheet(zip, sheet, records, sharedStrings); exportedCount += result.exported; skippedCount += records.length - result.exported; if (result.warning) warnings.push(result.warning); sheetResults.push({ kind: config.kind, label: config.label, sheetName: sheet.name, exportedCount: result.exported }); }
  zip.file('xl/workbook.xml', forceWorkbookRecalculation(workbookXml)); if (zip.file('xl/calcChain.xml')) zip.remove('xl/calcChain.xml');
  const output = await zip.generateAsync({ type: 'blob', mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', compression: 'DEFLATE', compressionOptions: { level: 6 } });
  return { blob: output, exportedCount, skippedCount, sheets: sheetResults, warnings };
}
