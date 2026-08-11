const fs = require('fs');

function replaceOnce(source, before, after, label) {
  if (!source.includes(before)) throw new Error(`Patch target not found: ${label}`);
  return source.replace(before, after);
}

// 1) Add a stable file hash to every parsed Excel row/payload.
{
  const path = 'src/utils/assetExcelImport.ts';
  let s = fs.readFileSync(path, 'utf8');

  s = replaceOnce(
    s,
    `export type ParsedAssetExcelRow = {\n  sourceFile: string;\n  sourceSheet: string;\n  sourceRow: number;\n  kind: AssetExcelImportKind;\n  input: AssetInput;\n};\n\nexport type ParsedAssetExcelFile = {\n  fileName: string;\n  sheetName: string;\n  kind: AssetExcelImportKind;\n  rows: ParsedAssetExcelRow[];\n  warnings: string[];\n};`,
    `export type ParsedAssetExcelRow = {\n  sourceFile: string;\n  sourceFileHash: string;\n  sourceSheet: string;\n  sourceRow: number;\n  kind: AssetExcelImportKind;\n  input: AssetInput;\n};\n\nexport type ParsedAssetExcelFile = {\n  fileName: string;\n  fileHash: string;\n  sheetName: string;\n  kind: AssetExcelImportKind;\n  rows: ParsedAssetExcelRow[];\n  warnings: string[];\n};`,
    'parsed Excel types'
  );

  s = replaceOnce(
    s,
    `const buildExcelPayload = (row: Record<string, unknown>, sourceFile: string, sourceSheet: string, sourceRow: number) => {\n  const payload: Record<string, unknown> = {\n    __sourceFile: sourceFile,\n    __sourceSheet: sourceSheet,\n    __sourceRow: sourceRow,\n  };`,
    `const buildExcelPayload = (row: Record<string, unknown>, sourceFile: string, sourceFileHash: string, sourceSheet: string, sourceRow: number) => {\n  const payload: Record<string, unknown> = {\n    __sourceFile: sourceFile,\n    __sourceFileHash: sourceFileHash,\n    __sourceSheet: sourceSheet,\n    __sourceRow: sourceRow,\n  };`,
    'Excel payload hash metadata'
  );

  s = replaceOnce(
    s,
    `  fileName: string,\n  sheetName: string,\n  sourceRow: number\n): AssetInput | null => {`,
    `  fileName: string,\n  fileHash: string,\n  sheetName: string,\n  sourceRow: number\n): AssetInput | null => {`,
    'rowToAsset file hash parameter'
  );

  s = replaceOnce(
    s,
    `    excelPayload: buildExcelPayload(row, fileName, sheetName, sourceRow),`,
    `    excelPayload: buildExcelPayload(row, fileName, fileHash, sheetName, sourceRow),`,
    'row payload hash call'
  );

  s = replaceOnce(
    s,
    `export async function parseOfficialAssetExcel(file: File): Promise<ParsedAssetExcelFile> {\n  const data = await file.arrayBuffer();\n  const workbook = XLSX.read(data, { type: 'array', cellDates: true, cellNF: true, cellStyles: true });`,
    `const hashExcelBuffer = async (data: ArrayBuffer) => {\n  if (globalThis.crypto?.subtle) {\n    const digest = await globalThis.crypto.subtle.digest('SHA-256', data);\n    return Array.from(new Uint8Array(digest)).map((byte) => byte.toString(16).padStart(2, '0')).join('');\n  }\n\n  let hash = 2166136261;\n  for (const byte of new Uint8Array(data)) {\n    hash ^= byte;\n    hash = Math.imul(hash, 16777619);\n  }\n  return \`fnv1a-\${(hash >>> 0).toString(16).padStart(8, '0')}\`;\n};\n\nexport async function parseOfficialAssetExcel(file: File): Promise<ParsedAssetExcelFile> {\n  const data = await file.arrayBuffer();\n  const fileHash = await hashExcelBuffer(data);\n  const workbook = XLSX.read(data, { type: 'array', cellDates: true, cellNF: true, cellStyles: true });`,
    'file hash calculation'
  );

  s = replaceOnce(
    s,
    `    const input = rowToAsset(row, selected.kind, file.name, selected.name, index + 1);\n    if (!input) continue;\n    rows.push({ sourceFile: file.name, sourceSheet: selected.name, sourceRow: index + 1, kind: selected.kind, input });`,
    `    const input = rowToAsset(row, selected.kind, file.name, fileHash, selected.name, index + 1);\n    if (!input) continue;\n    rows.push({ sourceFile: file.name, sourceFileHash: fileHash, sourceSheet: selected.name, sourceRow: index + 1, kind: selected.kind, input });`,
    'parsed row hash'
  );

  s = replaceOnce(
    s,
    `  return { fileName: file.name, sheetName: selected.name, kind: selected.kind, rows, warnings };`,
    `  return { fileName: file.name, fileHash, sheetName: selected.name, kind: selected.kind, rows, warnings };`,
    'parsed file hash result'
  );

  fs.writeFileSync(path, s);
}

// 2) Perform a full duplicate scan before import and reuse the same rules during import.
{
  const path = 'src/app/pages/AssetExcelImportPage.tsx';
  let s = fs.readFileSync(path, 'utf8');

  s = replaceOnce(
    s,
    `type ImportResult = {\n  total: number;\n  created: number;\n  skipped: number;\n  failed: number;\n  errors: string[];\n};`,
    `type ImportResult = {\n  total: number;\n  created: number;\n  skipped: number;\n  failed: number;\n  errors: string[];\n};\n\ntype DuplicateScan = {\n  total: number;\n  duplicate: number;\n  fresh: number;\n};`,
    'duplicate scan type'
  );

  s = replaceOnce(
    s,
    `const sourceKey = (row: ParsedAssetExcelRow) =>\n  \`\${row.sourceFile}::\${row.sourceSheet}::\${row.sourceRow}\`;\n\nconst existingSourceKey = (asset: any) => {\n  const payload = asset?.excelPayload as Record<string, unknown> | null | undefined;\n  if (!payload) return '';\n  const file = String(payload.__sourceFile ?? '').trim();\n  const sheet = String(payload.__sourceSheet ?? '').trim();\n  const row = String(payload.__sourceRow ?? '').trim();\n  return file && sheet && row ? \`\${file}::\${sheet}::\${row}\` : '';\n};`,
    `const normalizeSourcePart = (value: unknown) => String(value ?? '').trim().toLowerCase();\n\nconst sourceKeys = (row: ParsedAssetExcelRow) => {\n  const sheet = normalizeSourcePart(row.sourceSheet);\n  const sourceRow = String(row.sourceRow);\n  const keys = [\`file:\${normalizeSourcePart(row.sourceFile)}::\${sheet}::\${sourceRow}\`];\n  if (row.sourceFileHash) keys.unshift(\`hash:\${normalizeSourcePart(row.sourceFileHash)}::\${sheet}::\${sourceRow}\`);\n  return keys;\n};\n\nconst existingSourceKeys = (asset: any) => {\n  const payload = asset?.excelPayload as Record<string, unknown> | null | undefined;\n  if (!payload) return [];\n  const file = normalizeSourcePart(payload.__sourceFile);\n  const hash = normalizeSourcePart(payload.__sourceFileHash);\n  const sheet = normalizeSourcePart(payload.__sourceSheet);\n  const row = String(payload.__sourceRow ?? '').trim();\n  const keys: string[] = [];\n  if (hash && sheet && row) keys.push(\`hash:\${hash}::\${sheet}::\${row}\`);\n  if (file && sheet && row) keys.push(\`file:\${file}::\${sheet}::\${row}\`);\n  return keys;\n};\n\nconst buildDuplicateIndex = (existingList: any[]) => {\n  const importedSources = new Set<string>();\n  const serials = new Set<string>();\n  const barcodes = new Set<string>();\n\n  existingList.forEach((asset: any) => {\n    existingSourceKeys(asset).forEach((key) => importedSources.add(key));\n    const serial = cleanIdentifier(asset?.serialNumber).toLowerCase();\n    const barcode = cleanIdentifier(asset?.barcode).toLowerCase();\n    if (serial) serials.add(serial);\n    if (barcode) barcodes.add(barcode);\n  });\n\n  return { importedSources, serials, barcodes };\n};\n\nconst isKnownDuplicateRow = (row: ParsedAssetExcelRow, index: ReturnType<typeof buildDuplicateIndex>) => {\n  if (sourceKeys(row).some((key) => index.importedSources.has(key))) return true;\n  const serial = cleanIdentifier(row.input.serialNumber).toLowerCase();\n  const barcode = cleanIdentifier(row.input.barcode).toLowerCase();\n  if (serial && index.serials.has(serial)) return true;\n  if (barcode && index.barcodes.has(barcode)) return true;\n  return false;\n};`,
    'source-key and duplicate index helpers'
  );

  s = replaceOnce(
    s,
    `  const [message, setMessage] = useState('');\n  const [result, setResult] = useState<ImportResult | null>(null);`,
    `  const [message, setMessage] = useState('');\n  const [result, setResult] = useState<ImportResult | null>(null);\n  const [duplicateScan, setDuplicateScan] = useState<DuplicateScan | null>(null);`,
    'duplicate scan state'
  );

  s = replaceOnce(
    s,
    `    setBatchIndex(0);\n    setResult(null);\n    setMessage('جارٍ قراءة ملفات Excel والتعرف على بنية كل نموذج...');`,
    `    setBatchIndex(0);\n    setResult(null);\n    setDuplicateScan(null);\n    setMessage('جارٍ قراءة ملفات Excel والتعرف على بنية كل نموذج...');`,
    'reset duplicate scan'
  );

  s = replaceOnce(
    s,
    `      setFiles(parsed);\n      const total = parsed.reduce((sum, item) => sum + item.rows.length, 0);\n      setMessage(\`تم تحليل \${parsed.length} ملف بنجاح، وإيجاد \${total.toLocaleString('ar-SA')} سجل قابل للاستيراد.\`);`,
    `      setFiles(parsed);\n      const allRows = parsed.flatMap((item) => item.rows);\n      const total = allRows.length;\n      setMessage(\`تم تحليل \${parsed.length} ملف بنجاح، وإيجاد \${total.toLocaleString('ar-SA')} سجل. جارٍ فحص التكرار مع بيانات المنصة...\`);\n\n      const existingAssets = await getAssets();\n      const existingList = Array.isArray(existingAssets) ? existingAssets : [];\n      const duplicateIndex = buildDuplicateIndex(existingList);\n      let duplicate = 0;\n      const seenSources = new Set(duplicateIndex.importedSources);\n      const seenSerials = new Set(duplicateIndex.serials);\n      const seenBarcodes = new Set(duplicateIndex.barcodes);\n\n      for (const row of allRows) {\n        const rowKeys = sourceKeys(row);\n        const serial = cleanIdentifier(row.input.serialNumber).toLowerCase();\n        const barcode = cleanIdentifier(row.input.barcode).toLowerCase();\n        const repeated = rowKeys.some((key) => seenSources.has(key)) || (serial && seenSerials.has(serial)) || (barcode && seenBarcodes.has(barcode));\n        if (repeated) {\n          duplicate += 1;\n          continue;\n        }\n        rowKeys.forEach((key) => seenSources.add(key));\n        if (serial) seenSerials.add(serial);\n        if (barcode) seenBarcodes.add(barcode);\n      }\n\n      const scan = { total, duplicate, fresh: Math.max(0, total - duplicate) };\n      setDuplicateScan(scan);\n      if (total > 0 && duplicate === total) {\n        setMessage(\`تم فحص الملف: جميع السجلات وعددها \${total.toLocaleString('ar-SA')} مكررة أو سبق استيرادها. لن تتم إضافة سجلات جديدة.\`);\n      } else {\n        setMessage(\`اكتمل فحص الملف: \${scan.fresh.toLocaleString('ar-SA')} سجل جديد، و\${scan.duplicate.toLocaleString('ar-SA')} سجل مكرر/سبق استيراده.\`);\n      }`,
    'file duplicate preflight'
  );

  s = replaceOnce(
    s,
    `      setFiles([]);\n      setMessage(error?.message || 'تعذر قراءة ملفات Excel.');`,
    `      setFiles([]);\n      setDuplicateScan(null);\n      setMessage(error?.message || 'تعذر قراءة ملفات Excel.');`,
    'clear scan on parse error'
  );

  s = replaceOnce(
    s,
    `      const existingAssets = await getAssets();\n      const existingList = Array.isArray(existingAssets) ? existingAssets : [];\n      const importedSourceKeys = new Set(existingList.map(existingSourceKey).filter(Boolean));\n      const usedIdentifiers = new Set<string>();\n\n      existingList.forEach((asset: any) => {`,
    `      const existingAssets = await getAssets();\n      const existingList = Array.isArray(existingAssets) ? existingAssets : [];\n      const duplicateIndex = buildDuplicateIndex(existingList);\n      const importedSourceKeys = new Set(duplicateIndex.importedSources);\n      const seenSerials = new Set(duplicateIndex.serials);\n      const seenBarcodes = new Set(duplicateIndex.barcodes);\n      const usedIdentifiers = new Set<string>();\n\n      existingList.forEach((asset: any) => {`,
    'fresh duplicate index at import time'
  );

  s = replaceOnce(
    s,
    `      const queue: ParsedAssetExcelRow[] = [];\n      for (const row of importRows) {\n        if (importedSourceKeys.has(sourceKey(row))) {\n          state.skipped += 1;\n          continue;\n        }\n\n        const preferred = preferredImportedIdentifier(row);`,
    `      const queue: ParsedAssetExcelRow[] = [];\n      for (const row of importRows) {\n        const rowKeys = sourceKeys(row);\n        const serial = cleanIdentifier(row.input.serialNumber).toLowerCase();\n        const barcode = cleanIdentifier(row.input.barcode).toLowerCase();\n        const repeated = rowKeys.some((key) => importedSourceKeys.has(key)) || (serial && seenSerials.has(serial)) || (barcode && seenBarcodes.has(barcode));\n        if (repeated) {\n          state.skipped += 1;\n          continue;\n        }\n\n        rowKeys.forEach((key) => importedSourceKeys.add(key));\n        if (serial) seenSerials.add(serial);\n        if (barcode) seenBarcodes.add(barcode);\n\n        const preferred = preferredImportedIdentifier(row);`,
    'skip duplicate rows before queue'
  );

  s = replaceOnce(
    s,
    `          __platformImportedItemNumber: uniqueItemNumber,\n          __sourcePreferredIdentifier: preferred,`,
    `          __platformImportedItemNumber: uniqueItemNumber,\n          __sourcePreferredIdentifier: preferred,\n          __importFingerprint: sourceKeys(row)[0],`,
    'persist import fingerprint'
  );

  s = replaceOnce(
    s,
    `          {message && (\n            <div className=\"rounded-2xl border bg-background/70 px-4 py-3 text-sm font-semibold\">{message}</div>\n          )}`,
    `          {message && (\n            <div className=\"rounded-2xl border bg-background/70 px-4 py-3 text-sm font-semibold\">{message}</div>\n          )}\n\n          {duplicateScan && duplicateScan.total > 0 && (\n            <div className=\"grid grid-cols-1 gap-3 sm:grid-cols-3\">\n              <div className=\"rounded-2xl border bg-white/80 p-4\"><div className=\"text-xs text-muted-foreground\">إجمالي سجلات الملف</div><div className=\"mt-1 text-2xl font-black\">{duplicateScan.total.toLocaleString('ar-SA')}</div></div>\n              <div className=\"rounded-2xl border border-emerald-200 bg-emerald-50/70 p-4\"><div className=\"text-xs font-bold text-emerald-700\">سجلات جديدة</div><div className=\"mt-1 text-2xl font-black text-emerald-700\">{duplicateScan.fresh.toLocaleString('ar-SA')}</div></div>\n              <div className=\"rounded-2xl border border-amber-200 bg-amber-50/70 p-4\"><div className=\"text-xs font-bold text-amber-800\">مكرر / سبق استيراده</div><div className=\"mt-1 text-2xl font-black text-amber-800\">{duplicateScan.duplicate.toLocaleString('ar-SA')}</div></div>\n            </div>\n          )}`,
    'duplicate scan summary UI'
  );

  s = replaceOnce(
    s,
    `              <Button className=\"h-12 w-full rounded-2xl\" onClick={() => void importSelectedRows()} disabled={importing || importRows.length === 0}>\n                {importing ? <Loader2 className=\"ml-2 h-5 w-5 animate-spin\" /> : <UploadCloud className=\"ml-2 h-5 w-5\" />}\n                {importing ? 'جارٍ استيراد البيانات...' : \`استيراد \${batchLabel} إلى وحدة الأصول\`}\n              </Button>`,
    `              <Button\n                className=\"h-12 w-full rounded-2xl\"\n                onClick={() => void importSelectedRows()}\n                disabled={importing || importRows.length === 0 || Boolean(duplicateScan && duplicateScan.total > 0 && duplicateScan.duplicate === duplicateScan.total)}\n              >\n                {importing ? <Loader2 className=\"ml-2 h-5 w-5 animate-spin\" /> : <UploadCloud className=\"ml-2 h-5 w-5\" />}\n                {importing\n                  ? 'جارٍ استيراد البيانات...'\n                  : duplicateScan && duplicateScan.total > 0 && duplicateScan.duplicate === duplicateScan.total\n                    ? 'جميع سجلات الملف مكررة — لا يوجد ما يُستورد'\n                    : \`استيراد \${batchLabel} إلى وحدة الأصول\`}\n              </Button>`,
    'disable import when whole file duplicate'
  );

  fs.writeFileSync(path, s);
}

console.log('Asset Excel duplicate preflight patch applied.');
