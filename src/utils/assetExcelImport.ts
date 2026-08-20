import * as XLSX from 'xlsx';
import type { AssetInput } from '../types/asset';
import { MODEL_B_VERSION } from '../app/config/fixedAssetModelB';
import { inspectModelBWorkbook, parseModelBWorkbook } from './fixedAssetModelBWorkbook';

export type AssetExcelImportKind =
  | 'fixed_asset'
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
  inspectedSheets?: number;
  mappedSheets?: number;
};

const KIND_LABELS: Record<AssetExcelImportKind, string> = {
  fixed_asset: `سجل الأصول الثابتة — نموذج ب ${MODEL_B_VERSION}`,
  equipment: 'الآلات والمعدات',
  furniture: 'الأثاث',
  vehicle: 'أصول النقل العام',
  infrastructure: 'البنية التحتية',
  intangible: 'الأصول غير الملموسة',
  land: 'الأراضي',
};
export const ASSET_EXCEL_KIND_LABELS = KIND_LABELS;

const digitsToLatin = (value: unknown) => String(value ?? '')
  .replace(/[٠-٩]/g, (digit) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(digit)))
  .replace(/[۰-۹]/g, (digit) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(digit)))
  .trim();

const cleanText = (value: unknown) => {
  if (value === null || value === undefined) return '';
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return String(value).replace(/\s+/g, ' ').trim();
};

const normalize = (value: unknown) => cleanText(value)
  .toLowerCase()
  .replace(/[ـ]/g, '')
  .replace(/[\u064B-\u065F\u0670]/g, '')
  .replace(/[أإآ]/g, 'ا')
  .replace(/ى/g, 'ي')
  .replace(/ة/g, 'ه')
  .replace(/\s+/g, ' ')
  .trim();

const toNumber = (value: unknown): number | null => {
  const raw = digitsToLatin(value).replace(/\s/g, '').replace(/,/g, '');
  if (!raw) return null;
  const parsed = Number(raw.replace(/[^0-9.\-]/g, ''));
  return Number.isFinite(parsed) ? parsed : null;
};

const excelSerialToDate = (serial: number) => {
  const utcDays = Math.floor(serial - 25569);
  const date = new Date(utcDays * 86400 * 1000);
  return Number.isNaN(date.getTime()) ? null : date;
};

const toIsoDate = (value: unknown): string | null => {
  if (!value && value !== 0) return null;
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value.toISOString().slice(0, 10);
  if (typeof value === 'number' && value > 20000 && value < 90000) return excelSerialToDate(value)?.toISOString().slice(0, 10) || null;
  const raw = digitsToLatin(value);
  if (!raw) return null;
  const match = raw.match(/^(\d{1,4})[\/-](\d{1,2})[\/-](\d{1,4})/);
  if (match) {
    const a = Number(match[1]); const b = Number(match[2]); const c = Number(match[3]);
    const year = a > 1900 ? a : c < 100 ? 2000 + c : c;
    const month = b; const day = a > 1900 ? c : a;
    if (year >= 1900 && month >= 1 && month <= 12 && day >= 1 && day <= 31) return `${String(year).padStart(4,'0')}-${String(month).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
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

const makeFallbackItemNumber = (prefix: string, fileName: string, sourceRow: number) => {
  const safeFile = fileName.replace(/\.xlsx?$/i, '').replace(/[^A-Za-z0-9\u0600-\u06FF]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 24);
  return `XLS-${prefix.toUpperCase()}-${safeFile || 'FILE'}-${sourceRow}`;
};

const categoryFromClassification = (value: unknown): AssetInput['category'] => {
  const source = normalize(value);
  if (/ارض|اراضي|land/.test(source)) return 'land';
  if (/اثاث|furniture|كرسي|طاول|مكتب/.test(source)) return 'furniture';
  if (/نقل|مركب|سيار|طائر|سفين|vehicle|transport/.test(source)) return 'vehicle';
  if (/بنيه تحتيه|infrastructure/.test(source)) return 'infrastructure';
  if (/غير ملموس|برمج|برنامج|قاعده بيانات|ترخيص|software|license|intangible/.test(source)) return 'intangible';
  if (/تقنيه معلومات|حاسب|شبكات|اتصالات|computer|network|information technology/.test(source)) return 'it';
  if (/معد|اله|الات|مختبر|طبي|equipment|machinery/.test(source)) return 'equipment';
  return 'other';
};

const statusFromText = (value: string): AssetInput['status'] => {
  const normalized = normalize(value);
  if (/مفقود|عجز|lost/.test(normalized)) return 'lost';
  if (/تالف|damaged/.test(normalized)) return 'damaged';
  if (/صيانه|maintenance/.test(normalized)) return 'maintenance';
  if (/مستبعد|بيع|اتلاف|disposed/.test(normalized)) return 'disposed';
  if (/استخدام|يعمل|assigned|in.?use/.test(normalized)) return 'in_use';
  return 'available';
};

const modelBToAsset = (payload: Record<string, unknown>, fileName: string, fileHash: string, sourceSheet: string, sourceRow: number): AssetInput | null => {
  const description = cleanText(payload.AA);
  const mofNumber = cleanText(payload.Y);
  const entityUnique = cleanText(payload.Z);
  const tagNumber = cleanText(payload.AB);
  if (!description && !mofNumber && !entityUnique && !tagNumber) return null;
  const itemNumber = entityUnique || tagNumber || mofNumber || makeFallbackItemNumber('MODEL-B', fileName, sourceRow);
  const category = categoryFromClassification([payload.E, payload.H, payload.K, payload.N].map(cleanText).join(' '));
  const procedure = cleanText(payload.C);
  const modelB = Object.fromEntries(Object.entries(payload).filter(([, value]) => cleanText(value) !== ''));
  return {
    itemNumber,
    name: description || `أصل ثابت - ${itemNumber}`,
    category,
    barcode: null,
    status: statusFromText(procedure),
    technicalCondition: null,
    department: cleanText(payload.V) || null,
    building: cleanText(payload.AV) || null,
    floor: cleanText(payload.AW) || null,
    room: cleanText(payload.AX) || null,
    entityName: cleanText(payload.A) || null,
    entityCode: cleanText(payload.B) || null,
    assetDescription: description || null,
    cardNumber: tagNumber || null,
    responsibleDepartment: cleanText(payload.V) || null,
    region: cleanText(payload.AR) || null,
    city: cleanText(payload.AS) || null,
    buildingNumber: cleanText(payload.AV) || null,
    coordinates: cleanText(payload.AT) || null,
    classification1: cleanText(payload.E) || null,
    classification2: cleanText(payload.H) || null,
    classification3: cleanText(payload.K) || null,
    classification4: null, classification5: null, classification6: null,
    accountingGroup: cleanText(payload.N) || null,
    accountingGroupCode: cleanText(payload.M) || null,
    assetCode: cleanText(payload.P) || null,
    remainingLife: toNumber(payload.AP),
    usefulLife: toNumber(payload.AO),
    purchaseDate: null,
    purchaseDateType: 'gregorian',
    purchaseValue: toNumber(payload.AH),
    serviceDate: toIsoDate(payload.AF),
    serviceDateType: 'gregorian',
    acquisitionCost: toNumber(payload.AH),
    supportingCostDocument: null,
    archiveDocumentNumber: null,
    manufacturer: cleanText(payload.AE) || null,
    brand: cleanText(payload.AE) || null,
    model: null,
    serialNumber: null,
    lastInventoryDate: null,
    lastInventoryDateType: 'gregorian',
    unitOfMeasure: cleanText(payload.AC) || null,
    quantity: toNumber(payload.AD) ?? 1,
    excelPayload: {
      modelBVersion: MODEL_B_VERSION,
      modelB,
      __sourceFile: fileName,
      __sourceFileHash: fileHash,
      __sourceSheet: sourceSheet,
      __sourceRow: sourceRow,
      'رقم الأصل الفريد في نظام وزارة المالية (الرقم التعريفي)': mofNumber || undefined,
      'رقم الأصل الفريد بالجهة (الرقم المستخدم حاليا للأصل او الرقم تسلسلي)': entityUnique || undefined,
    },
    notes: `مستورد من نموذج ب: ${fileName} — الورقة: ${sourceSheet} — الصف: ${sourceRow}`,
    attachments: [],
  };
};

const classifySheet = (sheetName: string, fileName: string): Exclude<AssetExcelImportKind, 'fixed_asset'> | null => {
  const haystack = normalize(`${sheetName} ${fileName}`);
  if (/الالات|ppe|equipment/.test(haystack)) return 'equipment';
  if (/اثاث|furniture/.test(haystack)) return 'furniture';
  if (/النقل العام|transport/.test(haystack)) return 'vehicle';
  if (/البنيه التحتيه|infrastructure/.test(haystack)) return 'infrastructure';
  if (/غير ملموس|intangible/.test(haystack)) return 'intangible';
  if (/الاراضي|\bland\b/.test(haystack)) return 'land';
  return null;
};

const buildLegacyPayload = (row: Record<string, unknown>, sourceFile: string, sourceFileHash: string, sourceSheet: string, sourceRow: number) => {
  const payload: Record<string, unknown> = { __sourceFile: sourceFile, __sourceFileHash: sourceFileHash, __sourceSheet: sourceSheet, __sourceRow: sourceRow };
  Object.entries(row).forEach(([key,value]) => { if (!key || key.startsWith('__EMPTY')) return; if (cleanText(value) !== '') payload[key] = value instanceof Date ? value.toISOString() : value; });
  return payload;
};

const legacyRowToAsset = (row: Record<string, unknown>, kind: Exclude<AssetExcelImportKind, 'fixed_asset'>, fileName: string, fileHash: string, sheetName: string, sourceRow: number): AssetInput | null => {
  const name = text(row, 'وصف الأصل', 'Asset Description');
  const entityName = text(row, 'اسم الجهة', 'اسم الجهة ', 'Entity', 'Entity Name');
  if (!name && kind === 'land') return null;
  if (!name && !entityName) return null;
  const officialEntityNumber = text(row, 'رقم الأصل الفريد بالجهة (الرقم المستخدم حاليا للأصل او الرقم تسلسلي)', 'Unique Asset Number in the entity');
  const mofNumber = text(row, 'رقم الأصل الفريد في نظام وزارة المالية (الرقم التعريفي)', 'Unique Asset Number in MoF system');
  const tagNumber = text(row, 'رقم البطاقة', 'Tag number', 'Tag Number');
  const serialNumber = text(row, 'رقم المصنع التسلسلي الفريد', 'رقم الهيكل/الرقم التسلسلي', 'Serial Number (chassis, MSN,etc)');
  const itemNumber = officialEntityNumber || tagNumber || serialNumber || mofNumber || makeFallbackItemNumber(kind, fileName, sourceRow);
  const responsibleDepartment = text(row, 'القسم/الإدارة المسؤولة أو الشخص المسؤول', 'Custodian');
  const classification1 = text(row, 'وصف تصنيف الأصول المستوى الأول - عربي', 'Level 1 FA Module - Arabic Description');
  const classification2 = text(row, 'وصف تصنيف الأصول المستوى الثاني - عربي', 'Level 2 FA Module - Arabic Description');
  const classification3 = text(row, 'وصف تصنيف الأصول المستوى الثالث - عربي', 'Level 3 FA Module - Arabic Description');
  return {
    itemNumber, name: name || `${KIND_LABELS[kind]} - ${sourceRow}`, category: kind, barcode: null,
    status: statusFromText(text(row, 'حالة استغلال الأصل(يعمل بشكل دائم، احتياطي).', 'Asset Utilization')),
    technicalCondition: text(row, 'حالة الأصل', 'Asset Condition') || null,
    department: responsibleDepartment || null, building: text(row, 'رقم المبنى', 'Building Number') || null,
    floor: text(row, 'رقم الدور', 'Floors Number') || null, room: text(row, 'رقم الغرفة/ المكتب', 'Room/office Number') || null,
    entityName: entityName || null, entityCode: text(row, 'رمز الجهة', 'Entity Code') || null, assetDescription: name || null,
    cardNumber: tagNumber || null, responsibleDepartment: responsibleDepartment || null, region: text(row, 'المنطقة', 'Region') || null,
    city: text(row, 'المدينة', 'City') || null, buildingNumber: text(row, 'رقم المبنى', 'Building Number') || null,
    coordinates: text(row, 'الإحداثيات', 'Geographical Coordinates') || null,
    classification1: classification1 || null, classification2: classification2 || null, classification3: classification3 || null,
    classification4: null, classification5: null, classification6: null,
    accountingGroup: text(row, 'وصف المجموعة المحاسبية - عربي', 'accounting group Arabic Description') || null,
    accountingGroupCode: text(row, 'رمز المجموعة المحاسبية', 'accounting group Code') || null,
    assetCode: text(row, 'رمز الأصل للغرض المحاسبي', 'Asset Code For Accounting Purpose') || null,
    remainingLife: num(row, 'العمر المتبقي', 'Remaining useful life'), usefulLife: num(row, 'العمر الإنتاجي', 'Useful Life'),
    purchaseDate: date(row, 'تاريخ الإقتناء', 'Acquisition Date'), purchaseDateType: 'gregorian', purchaseValue: num(row, 'تكلفة الاقتناء', 'Acquisition Cost'),
    serviceDate: date(row, 'تاريخ الدخول في الخدمة', 'Date Placed in Service'), serviceDateType: 'gregorian', acquisitionCost: num(row, 'تكلفة الاقتناء', 'Acquisition Cost'),
    supportingCostDocument: text(row, 'الوثائق الداعمة لتكلفة الاقتناء', 'Supportive Documents For Acquisition Cost') || null,
    archiveDocumentNumber: text(row, 'رقم الأرشفة لوثيقة اثبات الأصل', 'Archive Document Number') || null,
    manufacturer: text(row, 'المصنع', 'Manufacturer') || null, brand: text(row, 'المصنع', 'Manufacturer') || null,
    model: text(row, 'الطراز', 'Model') || null, serialNumber: serialNumber || null,
    lastInventoryDate: date(row, 'تاريخ التحقق الميداني', 'Inspection Date'), lastInventoryDateType: 'gregorian',
    unitOfMeasure: text(row, 'وحدة القياس', 'Base Unit of Measure') || null, quantity: num(row, 'العدد', 'Quantity') ?? 1,
    excelPayload: buildLegacyPayload(row, fileName, fileHash, sheetName, sourceRow),
    notes: `مستورد من ملف Excel: ${fileName} — الورقة: ${sheetName} — الصف: ${sourceRow}`,
    attachments: [],
  };
};

const hashExcelBuffer = async (data: ArrayBuffer) => {
  if (globalThis.crypto?.subtle) {
    const digest = await globalThis.crypto.subtle.digest('SHA-256', data);
    return Array.from(new Uint8Array(digest)).map((byte) => byte.toString(16).padStart(2, '0')).join('');
  }
  let hash = 2166136261;
  for (const byte of new Uint8Array(data)) { hash ^= byte; hash = Math.imul(hash, 16777619); }
  return `fnv-${(hash >>> 0).toString(16).padStart(8, '0')}`;
};

const legacyHeaderScore = (row: unknown[]) => {
  const normalized = row.map(normalize);
  const hints = ['وصف الاصل','asset description','اسم الجهه','entity name','رقم البطاقه','tag number','رمز الجهه','entity code','العمر الانتاجي','useful life'];
  return hints.filter((hint) => normalized.some((cell) => cell === normalize(hint) || cell.includes(normalize(hint)))).length;
};

const parseLegacySheet = (workbook: XLSX.WorkBook, sheetName: string, kind: Exclude<AssetExcelImportKind, 'fixed_asset'>, fileName: string, fileHash: string): ParsedAssetExcelRow[] => {
  const matrix = XLSX.utils.sheet_to_json<unknown[]>(workbook.Sheets[sheetName], { header: 1, defval: '', raw: false });
  let headerRowIndex = -1; let bestScore = 0;
  matrix.slice(0, 20).forEach((row,index) => { const score = legacyHeaderScore(row || []); if (score > bestScore) { bestScore = score; headerRowIndex = index; } });
  if (headerRowIndex < 0 || bestScore < 2) return [];
  const headers = (matrix[headerRowIndex] || []).map((value,index) => cleanText(value) || `__EMPTY_${index}`);
  const rows: ParsedAssetExcelRow[] = [];
  for (let index = headerRowIndex + 1; index < matrix.length; index += 1) {
    const values = matrix[index]; if (!Array.isArray(values)) continue;
    const row: Record<string, unknown> = {}; headers.forEach((header,col) => { row[header] = values[col]; });
    if (!Object.entries(row).some(([key,value]) => !key.startsWith('__EMPTY') && cleanText(value) !== '')) continue;
    const input = legacyRowToAsset(row, kind, fileName, fileHash, sheetName, index + 1); if (!input) continue;
    rows.push({ sourceFile: fileName, sourceFileHash: fileHash, sourceSheet: sheetName, sourceRow: index + 1, kind, input });
  }
  return rows;
};

export const parseOfficialAssetExcel = async (file: File): Promise<ParsedAssetExcelFile> => {
  const data = await file.arrayBuffer();
  const fileHash = await hashExcelBuffer(data);
  const workbook = XLSX.read(data, { type: 'array', cellDates: true, cellStyles: true });
  const warnings: string[] = [];
  const rows: ParsedAssetExcelRow[] = [];
  const modelBInspections = inspectModelBWorkbook(workbook);
  const modelBSheets = new Set(modelBInspections.map((item) => item.sheetName));

  for (const item of parseModelBWorkbook(workbook, modelBInspections)) {
    const input = modelBToAsset(item.payload, file.name, fileHash, item.sourceSheet, item.sourceRow);
    if (!input) continue;
    rows.push({ sourceFile: file.name, sourceFileHash: fileHash, sourceSheet: item.sourceSheet, sourceRow: item.sourceRow, kind: 'fixed_asset', input });
  }

  let legacyMapped = 0;
  for (const sheetName of workbook.SheetNames) {
    if (modelBSheets.has(sheetName)) continue;
    const kind = classifySheet(sheetName, file.name);
    if (!kind || /mapping|lookup|vlook|list|تعريف|تصنيف وترميز|الاعمار الانتاجيه|حدود الرسمله/i.test(normalize(sheetName))) continue;
    const legacyRows = parseLegacySheet(workbook, sheetName, kind, file.name, fileHash);
    if (legacyRows.length) { rows.push(...legacyRows); legacyMapped += 1; }
  }

  const mappedSheets = modelBInspections.length + legacyMapped;
  const additionalSheets = Math.max(0, workbook.SheetNames.length - mappedSheets);
  if (!rows.length) warnings.push('تمت قراءة جميع أوراق المصنف، لكن لم يتم العثور على سجلات يمكن ربطها تلقائيًا بالسجل المركزي للأصول.');
  if (additionalSheets) warnings.push(`تمت قراءة ${additionalSheets} ورقة إضافية/مرجعية دون اعتبارها بيانات أصول؛ لم يتم رفض الملف بسببها.`);
  if (modelBInspections.length) warnings.push(`تم التعرف على ${modelBInspections.length} ورقة كسجل أصول ثابتة وفق نموذج ب ${MODEL_B_VERSION}.`);

  const primaryKind: AssetExcelImportKind = modelBInspections.length ? 'fixed_asset' : rows[0]?.kind || 'equipment';
  const sheetName = modelBInspections[0]?.sheetName || rows[0]?.sourceSheet || workbook.SheetNames[0] || '';
  return { fileName: file.name, fileHash, sheetName, kind: primaryKind, rows, warnings, inspectedSheets: workbook.SheetNames.length, mappedSheets };
};
