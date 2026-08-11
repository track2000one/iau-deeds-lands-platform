import * as XLSX from 'xlsx';
import type { AssetInput } from '../types/asset';

export type AssetExcelImportKind =
  | 'equipment'
  | 'furniture'
  | 'vehicle'
  | 'infrastructure'
  | 'intangible'
  | 'land';

export type ParsedAssetExcelRow = {
  sourceFile: string;
  sourceFileHash: string;
  sourceSheet: string;
  sourceRow: number;
  kind: AssetExcelImportKind;
  input: AssetInput;
};

export type ParsedAssetExcelFile = {
  fileName: string;
  fileHash: string;
  sheetName: string;
  kind: AssetExcelImportKind;
  rows: ParsedAssetExcelRow[];
  warnings: string[];
};

const KIND_LABELS: Record<AssetExcelImportKind, string> = {
  equipment: 'الآلات والمعدات',
  furniture: 'الأثاث',
  vehicle: 'أصول النقل العام',
  infrastructure: 'البنية التحتية',
  intangible: 'الأصول غير الملموسة',
  land: 'الأراضي',
};

export const ASSET_EXCEL_KIND_LABELS = KIND_LABELS;

const digitsToLatin = (value: unknown) =>
  String(value ?? '')
    .replace(/[٠-٩]/g, (digit) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(digit)))
    .replace(/[۰-۹]/g, (digit) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(digit)))
    .trim();

const cleanText = (value: unknown) => {
  if (value === null || value === undefined) return '';
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return String(value).replace(/\s+/g, ' ').trim();
};

const toNumber = (value: unknown): number | null => {
  const raw = digitsToLatin(value).replace(/\s/g, '').replace(/,/g, '');
  if (!raw) return null;

  const dotCount = (raw.match(/\./g) || []).length;
  const normalized = dotCount > 1
    ? `${raw.slice(0, raw.lastIndexOf('.')).replace(/\./g, '')}${raw.slice(raw.lastIndexOf('.'))}`
    : raw;
  const parsed = Number(normalized.replace(/[^0-9.\-]/g, ''));
  return Number.isFinite(parsed) ? parsed : null;
};

const excelSerialToDate = (serial: number) => {
  const utcDays = Math.floor(serial - 25569);
  const utcValue = utcDays * 86400;
  const date = new Date(utcValue * 1000);
  return Number.isNaN(date.getTime()) ? null : date;
};

const toIsoDate = (value: unknown): string | null => {
  if (!value && value !== 0) return null;
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString().slice(0, 10);
  }
  if (typeof value === 'number' && value > 20000 && value < 90000) {
    return excelSerialToDate(value)?.toISOString().slice(0, 10) || null;
  }

  const raw = digitsToLatin(value);
  if (!raw) return null;
  const m = raw.match(/^(\d{1,4})[\/-](\d{1,2})[\/-](\d{1,4})/);
  if (m) {
    let a = Number(m[1]);
    const b = Number(m[2]);
    let c = Number(m[3]);
    let year: number;
    let month: number;
    let day: number;
    if (a > 1900) {
      year = a; month = b; day = c;
    } else {
      day = a; month = b; year = c < 100 ? 2000 + c : c;
    }
    if (year >= 1900 && month >= 1 && month <= 12 && day >= 1 && day <= 31) {
      return `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    }
  }
  const parsed = new Date(raw);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString().slice(0, 10);
};

const pick = (row: Record<string, unknown>, ...names: string[]) => {
  for (const name of names) {
    const value = row[name];
    if (value !== undefined && value !== null && cleanText(value) !== '') return value;
  }
  return null;
};

const text = (row: Record<string, unknown>, ...names: string[]) => cleanText(pick(row, ...names));
const num = (row: Record<string, unknown>, ...names: string[]) => toNumber(pick(row, ...names));
const date = (row: Record<string, unknown>, ...names: string[]) => toIsoDate(pick(row, ...names));

const classifySheet = (sheetName: string, fileName: string): AssetExcelImportKind | null => {
  const haystack = `${sheetName} ${fileName}`.toLowerCase();
  if (haystack.includes('الالات') || haystack.includes('الآلات') || haystack.includes('ppe')) return 'equipment';
  if (haystack.includes('الأثاث') || haystack.includes('اثاث') || haystack.includes('furniture')) return 'furniture';
  if (haystack.includes('النقل العام') || haystack.includes('transport')) return 'vehicle';
  if (haystack.includes('البنية التحتية') || haystack.includes('infrastructure')) return 'infrastructure';
  if (haystack.includes('غير ملموس') || haystack.includes('intangible')) return 'intangible';
  if (haystack.includes('الأراضي') || haystack.includes('land')) return 'land';
  return null;
};

const chooseDataSheet = (workbook: XLSX.WorkBook, fileName: string) => {
  const candidates = workbook.SheetNames
    .map((name) => ({ name, kind: classifySheet(name, fileName) }))
    .filter((item) => item.kind && !/mapping|map|lookup|vlook/i.test(item.name));
  return candidates[0] || null;
};

const makeFallbackItemNumber = (kind: AssetExcelImportKind, fileName: string, sourceRow: number) => {
  const safeFile = fileName
    .replace(/\.xlsx?$/i, '')
    .replace(/[^A-Za-z0-9\u0600-\u06FF]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 24);
  return `XLS-${kind.toUpperCase()}-${safeFile || 'FILE'}-${sourceRow}`;
};

const statusFromText = (value: string): AssetInput['status'] => {
  const normalized = value.toLowerCase();
  if (/مفقود|عجز|lost/.test(normalized)) return 'lost';
  if (/تالف|damaged/.test(normalized)) return 'damaged';
  if (/صيانة|maintenance/.test(normalized)) return 'maintenance';
  if (/مستبعد|disposed/.test(normalized)) return 'disposed';
  if (/استخدام|يعمل|دائم|assigned|in.?use/.test(normalized)) return 'in_use';
  return 'available';
};

const buildExcelPayload = (row: Record<string, unknown>, sourceFile: string, sourceFileHash: string, sourceSheet: string, sourceRow: number) => {
  const payload: Record<string, unknown> = {
    __sourceFile: sourceFile,
    __sourceFileHash: sourceFileHash,
    __sourceSheet: sourceSheet,
    __sourceRow: sourceRow,
  };
  Object.entries(row).forEach(([key, value]) => {
    if (!key || key.startsWith('__EMPTY')) return;
    const cleaned = cleanText(value);
    if (cleaned !== '') payload[key] = value instanceof Date ? value.toISOString() : value;
  });
  return payload;
};

const rowToAsset = (
  row: Record<string, unknown>,
  kind: AssetExcelImportKind,
  fileName: string,
  fileHash: string,
  sheetName: string,
  sourceRow: number
): AssetInput | null => {
  const name = text(row, 'وصف الأصل', 'Asset Description');
  const entityName = text(row, 'اسم الجهة', 'اسم الجهة ', 'Entity');
  const entityCode = text(row, 'رمز الجهة', 'رمز الجهة ', 'Entity Code');

  // Land files may contain intentionally sparse records. Keep them only when there is
  // at least a description/identifier; otherwise they are reference rows, not assets.
  if (!name && kind === 'land') return null;
  if (!name && !entityName) return null;

  const officialEntityNumber = text(
    row,
    'رقم الأصل الفريد بالجهة (الرقم المستخدم حاليا للأصل او الرقم تسلسلي)',
    'Unique Asset Number in the entity'
  );
  const mofNumber = text(
    row,
    'رقم الأصل الفريد في نظام وزارة المالية (الرقم التعريفي)',
    'Unique Asset Number in MoF system'
  );
  const tagNumber = text(row, 'رقم البطاقة', 'Tag number');
  const serialNumber = text(
    row,
    'رقم المصنع التسلسلي الفريد',
    'رقم الهيكل/الرقم التسلسلي',
    'Serial Number (chassis, MSN,etc)'
  );
  const itemNumber = officialEntityNumber || tagNumber || serialNumber || mofNumber || makeFallbackItemNumber(kind, fileName, sourceRow);

  const responsibleDepartment = text(
    row,
    'القسم/الإدارة المسؤولة أو الشخص المسؤول',
    'Custodian'
  );
  const technicalCondition = text(row, 'حالة الأصل', 'Asset Condition');
  const utilization = text(row, 'حالة استغلال الأصل(يعمل بشكل دائم، احتياطي).', 'Asset Utilization');

  const classification1 = text(row, 'وصف تصنيف الأصول المستوى الأول - عربي', 'Level 1 FA Module - Arabic Description');
  const classification2 = text(row, 'وصف تصنيف الأصول المستوى الثاني - عربي', 'Level 2 FA Module - Arabic Description');
  const classification3 = text(row, 'وصف تصنيف الأصول المستوى الثالث - عربي', 'Level 3 FA Module - Arabic Description');
  const accountingGroup = text(row, 'وصف المجموعة المحاسبية - عربي', 'accounting group Arabic Description');

  const input: AssetInput = {
    itemNumber,
    name: name || `${KIND_LABELS[kind]} - ${sourceRow}`,
    category: kind,
    barcode: null,
    status: statusFromText(utilization),
    technicalCondition: technicalCondition || null,
    department: responsibleDepartment || null,
    building: text(row, 'رقم المبنى', 'Building Number') || null,
    floor: text(row, 'رقم الدور', 'Floors Number') || null,
    room: text(row, 'رقم الغرفة/ المكتب', 'رقم الغرفة/المكتب', 'Room/office Number') || null,
    entityName: entityName || null,
    entityCode: entityCode || null,
    assetDescription: name || null,
    cardNumber: tagNumber || null,
    responsibleDepartment: responsibleDepartment || null,
    region: text(row, 'المنطقة', 'Region') || null,
    city: text(row, 'المدينة', 'City') || null,
    buildingNumber: text(row, 'رقم المبنى', 'Building Number') || null,
    coordinates: text(row, 'الإحداثيات', 'Geographical Coordinates') || null,
    classification1: classification1 || null,
    classification2: classification2 || null,
    classification3: classification3 || null,
    classification4: null,
    classification5: null,
    classification6: null,
    accountingGroup: accountingGroup || null,
    accountingGroupCode: text(row, 'رمز المجموعة المحاسبية', 'accounting group Code') || null,
    assetCode: text(row, 'رمز الأصل للغرض المحاسبي', 'رمز الأصل للغرض المحاسبي ', 'Asset Code For Accounting Purpose') || null,
    remainingLife: num(row, 'العمر المتبقي', 'Remaining useful life'),
    usefulLife: num(row, 'العمر الإنتاجي', 'العمر الإنتاجي ', 'Useful Life'),
    purchaseDate: date(row, 'تاريخ الإقتناء', 'Acquisition Date'),
    purchaseDateType: 'gregorian',
    purchaseValue: num(row, 'تكلفة الاقتناء', 'Acquisition Cost'),
    serviceDate: date(row, 'تاريخ الدخول في الخدمة', 'Date Placed in Service'),
    serviceDateType: 'gregorian',
    acquisitionCost: num(row, 'تكلفة الاقتناء', 'Acquisition Cost'),
    supportingCostDocument: text(row, 'الوثائق الداعمة لتكلفة الاقتناء', 'الوثائق الداعمة لتكلفة الاقتناء ', 'Supportive Documents For Acquisition Cost') || null,
    archiveDocumentNumber: text(row, 'رقم الأرشفة لوثيقة اثبات الأصل', 'Archive Document Number') || null,
    manufacturer: text(row, 'المصنع', 'Manufacturer') || null,
    brand: text(row, 'المصنع', 'Manufacturer') || null,
    model: text(row, 'الطراز', 'Model') || null,
    serialNumber: serialNumber || null,
    lastInventoryDate: date(row, 'تاريخ التحقق الميداني', 'Inspection Date'),
    lastInventoryDateType: 'gregorian',
    unitOfMeasure: text(row, 'وحدة القياس', 'Base Unit of Measure') || null,
    quantity: num(row, 'العدد', 'Quantity') ?? 1,
    excelPayload: buildExcelPayload(row, fileName, fileHash, sheetName, sourceRow),
    notes: `مستورد للاختبار من ملف Excel: ${fileName} — الورقة: ${sheetName} — الصف: ${sourceRow}`,
    attachments: [],
  };

  return input;
};

const hashExcelBuffer = async (data: ArrayBuffer) => {
  if (globalThis.crypto?.subtle) {
    const digest = await globalThis.crypto.subtle.digest('SHA-256', data);
    return Array.from(new Uint8Array(digest)).map((byte) => byte.toString(16).padStart(2, '0')).join('');
  }

  let hash = 2166136261;
  for (const byte of new Uint8Array(data)) {
    hash ^= byte;
    hash = Math.imul(hash, 16777619);
  }
  return `fnv1a-${(hash >>> 0).toString(16).padStart(8, '0')}`;
};

export async function parseOfficialAssetExcel(file: File): Promise<ParsedAssetExcelFile> {
  const data = await file.arrayBuffer();
  const fileHash = await hashExcelBuffer(data);
  const workbook = XLSX.read(data, { type: 'array', cellDates: true, cellNF: true, cellStyles: true });
  const selected = chooseDataSheet(workbook, file.name);
  if (!selected || !selected.kind) {
    throw new Error(`تعذر تحديد نوع ملف الأصول: ${file.name}`);
  }

  const sheet = workbook.Sheets[selected.name];
  const matrix = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, raw: true, defval: null });
  const headerRowIndex = matrix.findIndex((row) => {
    const values = Array.isArray(row) ? row.map(cleanText) : [];
    return values.includes('اسم الجهة') || values.includes('اسم الجهة ') || values.includes('Entity');
  });
  if (headerRowIndex < 0) throw new Error(`لم يتم العثور على صف عناوين البيانات في: ${file.name}`);

  const headers = (matrix[headerRowIndex] || []).map((value, index) => cleanText(value) || `__EMPTY_${index}`);
  const warnings: string[] = [];
  const rows: ParsedAssetExcelRow[] = [];

  for (let index = headerRowIndex + 1; index < matrix.length; index += 1) {
    const values = matrix[index];
    if (!Array.isArray(values)) continue;
    const row: Record<string, unknown> = {};
    headers.forEach((header, col) => { row[header] = values[col]; });
    const hasAnyData = Object.entries(row).some(([key, value]) => !key.startsWith('__EMPTY') && cleanText(value) !== '');
    if (!hasAnyData) continue;
    const input = rowToAsset(row, selected.kind, file.name, fileHash, selected.name, index + 1);
    if (!input) continue;
    rows.push({ sourceFile: file.name, sourceFileHash: fileHash, sourceSheet: selected.name, sourceRow: index + 1, kind: selected.kind, input });
  }

  if (rows.length === 0) warnings.push('لم يتم العثور على سجلات قابلة للاستيراد في الملف.');
  return { fileName: file.name, fileHash, sheetName: selected.name, kind: selected.kind, rows, warnings };
}
