import JSZip from 'jszip';
import * as XLSX from 'xlsx';
import {
  ACCOUNTING_FIELDS,
  excelColumnToIndex,
  isMeaningfulAccountingValue,
  type AccountingRecordType,
} from '../app/config/accountingTransformationFields';

export type AccountingWorkbookRule = {
  id: string;
  label: string;
  description: string;
  trigger: {
    fillRgb?: string;
    recordType?: AccountingRecordType;
    canonicalColumn?: string;
  };
};

export const ACCOUNTING_WORKBOOK_RULES: AccountingWorkbookRule[] = [
  {
    id: 'classification-yellow-useful-life',
    label: 'مراجعة التصنيف والعمر الإنتاجي',
    description: 'علامة صفراء FFFF00 على حقل العمر الإنتاجي في سجل مبنى: مراجعة H:T كوحدة واحدة ثم فحص العمر الإنتاجي.',
    trigger: { fillRgb: 'FFFF00', recordType: 'building', canonicalColumn: 'U' },
  },
];

export type AccountingWorkbookMarker = {
  sheetName: string;
  row: number;
  columnIndex: number;
  columnLetter: string;
  address: string;
  fillRgb: string;
  value?: string;
  recordType?: AccountingRecordType;
  canonicalColumn?: string;
  ruleIds: string[];
};

export type AccountingSheetInspection = {
  sheetName: string;
  rowCount: number;
  columnCount: number;
  recordType?: AccountingRecordType;
  mapping: Record<number, string>;
  dataStartRow: number;
  matchedFields: number;
  confidence: number;
  mode: 'template' | 'header' | 'name-fallback' | 'unmapped';
  markerCount: number;
  matchedRuleCount: number;
};

export type AccountingWorkbookInspection = {
  sheets: AccountingSheetInspection[];
  markers: AccountingWorkbookMarker[];
  mappedSheetCount: number;
  unmappedSheetCount: number;
  totalMarkerCount: number;
  matchedRuleMarkerCount: number;
  unmatchedMarkerCount: number;
  officialTemplateUsed: boolean;
};

export type AccountingIntakeRow = {
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

const normalizeRgb = (value: unknown) => {
  const rgb = String(value ?? '').trim().replace(/^#/, '').toUpperCase();
  if (rgb.length === 8) return rgb.slice(2);
  return rgb;
};

const meaningfulHeader = (value: unknown) => {
  const text = String(value ?? '').trim();
  return text.length >= 2 && text.length <= 420;
};

const matrixFor = (workbook: XLSX.WorkBook, sheetName: string) => XLSX.utils.sheet_to_json<unknown[]>(
  workbook.Sheets[sheetName],
  { header: 1, defval: '', raw: false },
);

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
  const matrix = matrixFor(workbook, sheetName).slice(0, HEADER_SCAN_ROWS);
  const values = matrix.flat().map(normalizeText).filter(Boolean);
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

const enrichProfileFromOfficialWorkbook = (
  profile: CanonicalProfile,
  officialWorkbook?: XLSX.WorkBook,
) => {
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

  const matrix = matrixFor(officialWorkbook, best.sheetName).slice(0, HEADER_SCAN_ROWS);
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

export const buildAccountingCanonicalProfiles = (officialWorkbook?: XLSX.WorkBook) => {
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

const inspectSheetAgainstProfile = (
  workbook: XLSX.WorkBook,
  sheetName: string,
  profile: CanonicalProfile,
) => {
  const matrix = matrixFor(workbook, sheetName);
  const headerRows = matrix.slice(0, HEADER_SCAN_ROWS);
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
  const positionalMapping: Record<number, string> = {};
  for (const field of ACCOUNTING_FIELDS[profile.recordType]) {
    const columnIndex = excelColumnToIndex(field.c);
    const values = headerRows.map((row) => normalizeText(row[columnIndex])).filter(Boolean);
    const labels = profile.labels.get(field.c) || new Set<string>();
    const matches = values.some((value) => {
      if (labels.has(value)) return true;
      return Array.from(labels).some((label) => label.length >= 5 && (value.includes(label) || label.includes(value)));
    });
    if (matches) {
      positionalMatches += 1;
      positionalMapping[columnIndex] = field.c;
    }
  }

  const normalizedName = normalizeText(sheetName);
  const nameMatches = profile.recordType === 'building'
    ? normalizedName.includes('building') || normalizedName.includes('مباني')
    : normalizedName.includes('land') || normalizedName.includes('اراضي') || normalizedName.includes('ارض');

  const templateLike = positionalMatches >= Math.max(MIN_HEADER_MATCHES, Math.floor(bestRowMatches * 0.75));
  let mapping: Record<number, string> = {};
  let mode: AccountingSheetInspection['mode'] = 'unmapped';
  let matchedFields = 0;
  let dataStartRow = profile.dataStartRow;

  if (templateLike && positionalMatches >= MIN_HEADER_MATCHES) {
    mapping = {};
    for (const field of ACCOUNTING_FIELDS[profile.recordType]) mapping[excelColumnToIndex(field.c)] = field.c;
    mode = 'template';
    matchedFields = positionalMatches;
    dataStartRow = profile.dataStartRow;
  } else if (bestRowMatches >= MIN_HEADER_MATCHES) {
    mapping = bestRowMapping;
    mode = 'header';
    matchedFields = bestRowMatches;
    dataStartRow = bestRow + 1;
  } else if (nameMatches) {
    mapping = {};
    for (const field of ACCOUNTING_FIELDS[profile.recordType]) mapping[excelColumnToIndex(field.c)] = field.c;
    mode = 'name-fallback';
    matchedFields = Math.max(bestRowMatches, positionalMatches);
    dataStartRow = profile.dataStartRow;
  }

  const confidence = Math.min(100, matchedFields * 8 + (mode === 'template' ? 20 : 0) + (nameMatches ? 10 : 0));
  return { mapping, mode, matchedFields, dataStartRow, confidence, evidence: Math.max(bestRowMatches, positionalMatches) };
};

const xmlDoc = (xml: string) => new DOMParser().parseFromString(xml, 'application/xml');
const children = (node: Element, localName: string) => Array.from(node.children).filter((child) => child.localName === localName);
const firstChild = (node: Element, localName: string) => children(node, localName)[0] || null;

const normalizeZipPath = (base: string, target: string) => {
  if (target.startsWith('/')) return target.replace(/^\/+/, '');
  const stack = base.split('/').filter(Boolean);
  stack.pop();
  for (const part of target.split('/')) {
    if (!part || part === '.') continue;
    if (part === '..') stack.pop();
    else stack.push(part);
  }
  return stack.join('/');
};

const visibleAttentionColor = (rgb: string) => {
  const value = normalizeRgb(rgb);
  if (!value || value === 'FFFFFF' || value === '000000' || value === 'F2F2F2' || value === 'D9E1F2') return false;
  return /^[0-9A-F]{6}$/.test(value);
};

const extractFillMarkersFromXlsx = async (buffer: ArrayBuffer): Promise<AccountingWorkbookMarker[]> => {
  const markers: AccountingWorkbookMarker[] = [];
  try {
    const zip = await JSZip.loadAsync(buffer);
    const workbookFile = zip.file('xl/workbook.xml');
    const relsFile = zip.file('xl/_rels/workbook.xml.rels');
    const stylesFile = zip.file('xl/styles.xml');
    if (!workbookFile || !relsFile || !stylesFile) return markers;
    const [workbookXml, relsXml, stylesXml] = await Promise.all([
      workbookFile.async('text'),
      relsFile.async('text'),
      stylesFile.async('text'),
    ]);
    const workbookDoc = xmlDoc(workbookXml);
    const relsDoc = xmlDoc(relsXml);
    const stylesDoc = xmlDoc(stylesXml);

    const fillsNode = Array.from(stylesDoc.getElementsByTagNameNS('*', 'fills'))[0];
    const xfsNode = Array.from(stylesDoc.getElementsByTagNameNS('*', 'cellXfs'))[0];
    const fills = fillsNode ? children(fillsNode, 'fill') : [];
    const xfs = xfsNode ? children(xfsNode, 'xf') : [];
    const fillColors = new Map<number, string>();
    fills.forEach((fill, index) => {
      const pattern = firstChild(fill, 'patternFill');
      const patternType = String(pattern?.getAttribute('patternType') || '').toLowerCase();
      const fg = pattern ? firstChild(pattern, 'fgColor') : null;
      const rgb = normalizeRgb(fg?.getAttribute('rgb'));
      if ((patternType === 'solid' || !patternType) && visibleAttentionColor(rgb)) fillColors.set(index, rgb);
    });
    const styleColors = new Map<number, string>();
    xfs.forEach((xf, index) => {
      const fillId = Number(xf.getAttribute('fillId') || 0);
      const rgb = fillColors.get(fillId);
      if (rgb) styleColors.set(index, rgb);
    });

    const relationships = new Map<string, string>();
    Array.from(relsDoc.getElementsByTagNameNS('*', 'Relationship')).forEach((node) => {
      const id = node.getAttribute('Id');
      const target = node.getAttribute('Target');
      if (id && target) relationships.set(id, target);
    });

    for (const sheet of Array.from(workbookDoc.getElementsByTagNameNS('*', 'sheet'))) {
      const sheetName = String(sheet.getAttribute('name') || '').trim();
      const relId = sheet.getAttributeNS('http://schemas.openxmlformats.org/officeDocument/2006/relationships', 'id') || sheet.getAttribute('r:id');
      const target = relId ? relationships.get(relId) : undefined;
      if (!sheetName || !target) continue;
      const sheetFile = zip.file(normalizeZipPath('xl/workbook.xml', target));
      if (!sheetFile) continue;
      const sheetDoc = xmlDoc(await sheetFile.async('text'));
      for (const cell of Array.from(sheetDoc.getElementsByTagNameNS('*', 'c'))) {
        const styleId = Number(cell.getAttribute('s') || 0);
        const fillRgb = styleColors.get(styleId);
        if (!fillRgb) continue;
        const address = String(cell.getAttribute('r') || '').toUpperCase();
        const decoded = XLSX.utils.decode_cell(address);
        markers.push({
          sheetName,
          row: decoded.r + 1,
          columnIndex: decoded.c,
          columnLetter: XLSX.utils.encode_col(decoded.c),
          address,
          fillRgb,
          ruleIds: [],
        });
      }
    }
  } catch {
    return markers;
  }
  return markers;
};

const extractFillMarkersFallback = (workbook: XLSX.WorkBook) => {
  const markers: AccountingWorkbookMarker[] = [];
  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName] as XLSX.WorkSheet & Record<string, any>;
    const range = XLSX.utils.decode_range(sheet['!ref'] || 'A1:A1');
    for (let row = range.s.r; row <= range.e.r; row += 1) {
      for (let column = range.s.c; column <= range.e.c; column += 1) {
        const address = XLSX.utils.encode_cell({ r: row, c: column });
        const cell = sheet[address] as any;
        const fillRgb = normalizeRgb(cell?.s?.fill?.fgColor?.rgb || cell?.s?.fgColor?.rgb);
        if (!visibleAttentionColor(fillRgb)) continue;
        markers.push({ sheetName, row: row + 1, columnIndex: column, columnLetter: XLSX.utils.encode_col(column), address, fillRgb, value: String(cell?.v ?? ''), ruleIds: [] });
      }
    }
  }
  return markers;
};

const ruleMatchesMarker = (rule: AccountingWorkbookRule, marker: AccountingWorkbookMarker) => {
  if (rule.trigger.fillRgb && normalizeRgb(rule.trigger.fillRgb) !== normalizeRgb(marker.fillRgb)) return false;
  if (rule.trigger.recordType && rule.trigger.recordType !== marker.recordType) return false;
  if (rule.trigger.canonicalColumn && rule.trigger.canonicalColumn !== marker.canonicalColumn) return false;
  return true;
};

export const inspectAccountingWorkbook = async (
  workbook: XLSX.WorkBook,
  buffer: ArrayBuffer,
  officialWorkbook?: XLSX.WorkBook,
): Promise<AccountingWorkbookInspection> => {
  const profiles = buildAccountingCanonicalProfiles(officialWorkbook);
  const sheets: AccountingSheetInspection[] = workbook.SheetNames.map((sheetName) => {
    const sheet = workbook.Sheets[sheetName];
    const dimensions = sheetDimensions(sheet);
    const land = inspectSheetAgainstProfile(workbook, sheetName, profiles.land);
    const building = inspectSheetAgainstProfile(workbook, sheetName, profiles.building);
    const bestType: AccountingRecordType | undefined = land.mode === 'unmapped' && building.mode === 'unmapped'
      ? undefined
      : building.confidence > land.confidence ? 'building' : land.confidence > building.confidence ? 'land' : building.evidence > land.evidence ? 'building' : 'land';
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
      markerCount: 0,
      matchedRuleCount: 0,
    };
  });

  let markers = await extractFillMarkersFromXlsx(buffer);
  if (!markers.length) markers = extractFillMarkersFallback(workbook);
  const sheetByName = new Map(sheets.map((sheet) => [sheet.sheetName, sheet]));
  markers = markers
    .map((marker) => {
      const sheet = sheetByName.get(marker.sheetName);
      const canonicalColumn = sheet?.mapping?.[marker.columnIndex];
      const recordType = sheet?.recordType;
      const enriched: AccountingWorkbookMarker = { ...marker, canonicalColumn, recordType };
      enriched.ruleIds = ACCOUNTING_WORKBOOK_RULES.filter((rule) => ruleMatchesMarker(rule, enriched)).map((rule) => rule.id);
      return enriched;
    })
    .filter((marker) => {
      const sheet = sheetByName.get(marker.sheetName);
      return !sheet?.recordType || marker.row > sheet.dataStartRow;
    });

  for (const sheet of sheets) {
    const relevant = markers.filter((marker) => marker.sheetName === sheet.sheetName);
    sheet.markerCount = relevant.length;
    sheet.matchedRuleCount = relevant.filter((marker) => marker.ruleIds.length).length;
  }

  return {
    sheets,
    markers,
    mappedSheetCount: sheets.filter((sheet) => sheet.recordType).length,
    unmappedSheetCount: sheets.filter((sheet) => !sheet.recordType).length,
    totalMarkerCount: markers.length,
    matchedRuleMarkerCount: markers.filter((marker) => marker.ruleIds.length).length,
    unmatchedMarkerCount: markers.filter((marker) => !marker.ruleIds.length).length,
    officialTemplateUsed: Boolean(officialWorkbook),
  };
};

export const parseAccountingWorkbook = (
  workbook: XLSX.WorkBook,
  inspection: AccountingWorkbookInspection,
): AccountingIntakeRow[] => {
  const output: AccountingIntakeRow[] = [];
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

export const markersForRule = (inspection: AccountingWorkbookInspection, ruleId: string) =>
  inspection.markers.filter((marker) => marker.ruleIds.includes(ruleId));
