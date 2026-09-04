import ExcelJS from 'exceljs';
import * as XLSX from 'xlsx';

export type ExcelReportRow = Record<string, unknown>;
export type ExcelMetric = { label: string; value: string | number; tone?: 'blue' | 'green' | 'amber' | 'red' | 'slate' };
export type ProfessionalExcelOptions = {
  title?: string;
  subtitle?: string;
  filters?: string;
  metrics?: ExcelMetric[];
  orientation?: 'portrait' | 'landscape';
  imageLoader?: (fileId?: string, url?: string, mimeType?: string) => Promise<Blob | null>;
};

const safeSheetName = (name: string) => String(name || 'بيانات').replace(/[\\/?*\[\]:]/g, ' ').trim().slice(0, 31) || 'بيانات';

export const appendExcelReportSheet = (
  workbook: XLSX.WorkBook,
  name: string,
  rows: ExcelReportRow[],
  emptyMessage = 'لا توجد بيانات',
) => {
  const normalizedRows = rows.length ? rows : [{ ملاحظة: emptyMessage }];
  const worksheet = XLSX.utils.json_to_sheet(normalizedRows);
  const headers = Object.keys(normalizedRows[0] || {});

  worksheet['!cols'] = headers.map((header) => {
    const sampleLengths = normalizedRows.slice(0, 250).map((row) => String(row[header] ?? '').length);
    const maxLength = Math.max(header.length, ...sampleLengths, 10);
    return { wch: Math.min(58, Math.max(12, maxLength + 2)) };
  });

  normalizedRows.forEach((row, rowIndex) => {
    headers.forEach((header, columnIndex) => {
      const value = String(row[header] ?? '').trim();
      if (!/^https?:\/\//i.test(value)) return;
      const address = XLSX.utils.encode_cell({ r: rowIndex + 1, c: columnIndex });
      const cell = worksheet[address];
      if (cell) cell.l = { Target: value, Tooltip: 'فتح الصورة / المرفق' };
    });
  });

  if (headers.length && normalizedRows.length) {
    worksheet['!autofilter'] = {
      ref: XLSX.utils.encode_range({ r: 0, c: 0 }, { r: normalizedRows.length, c: headers.length - 1 }),
    };
  }

  XLSX.utils.book_append_sheet(workbook, worksheet, safeSheetName(name));
  return worksheet;
};

export const excelReportDateStamp = () => new Date().toISOString().slice(0, 10);

const palette = {
  navy: 'FF123047',
  teal: 'FF0F766E',
  sky: 'FF0369A1',
  blueSoft: 'FFE0F2FE',
  greenSoft: 'FFECFDF5',
  amberSoft: 'FFFFFBEB',
  redSoft: 'FFFEF2F2',
  slateSoft: 'FFF8FAFC',
  border: 'FFCBD5E1',
  text: 'FF172033',
  muted: 'FF64748B',
  white: 'FFFFFFFF',
};

const thinBorder: Partial<ExcelJS.Borders> = {
  top: { style: 'thin', color: { argb: palette.border } },
  left: { style: 'thin', color: { argb: palette.border } },
  bottom: { style: 'thin', color: { argb: palette.border } },
  right: { style: 'thin', color: { argb: palette.border } },
};

const fill = (argb: string): ExcelJS.Fill => ({ type: 'pattern', pattern: 'solid', fgColor: { argb } });

const toneFill = (tone?: ExcelMetric['tone']) => {
  if (tone === 'green') return palette.greenSoft;
  if (tone === 'amber') return palette.amberSoft;
  if (tone === 'red') return palette.redSoft;
  if (tone === 'slate') return palette.slateSoft;
  return palette.blueSoft;
};

const normalizeValue = (value: unknown) => {
  if (value === null || value === undefined) return '';
  if (value instanceof Date) return value;
  if (typeof value === 'number' || typeof value === 'boolean') return value;
  return String(value);
};

const isMediaSheet = (name: string, headers: string[]) => /الصور|المرفقات/.test(name) || (headers.includes('الرابط') && (headers.includes('نوع الملف') || headers.includes('اسم الملف')));
const looksLikeImage = (mime: string, fileName: string, url: string) => /^image\//i.test(mime) || /\.(png|jpe?g|webp|gif)(?:$|[?#])/i.test(fileName || url);

const blobToDataUrl = (blob: Blob) => new Promise<string>((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = () => resolve(String(reader.result || ''));
  reader.onerror = () => reject(reader.error || new Error('تعذر قراءة الصورة'));
  reader.readAsDataURL(blob);
});

const prepareExcelImage = async (blob: Blob): Promise<{ base64: string; extension: 'png' | 'jpeg' }> => {
  const lower = String(blob.type || '').toLowerCase();
  if (lower.includes('jpeg') || lower.includes('jpg')) return { base64: await blobToDataUrl(blob), extension: 'jpeg' };
  if (lower.includes('png')) return { base64: await blobToDataUrl(blob), extension: 'png' };

  const bitmap = await createImageBitmap(blob);
  const maxW = 320;
  const maxH = 220;
  const scale = Math.min(1, maxW / bitmap.width, maxH / bitmap.height);
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(bitmap.width * scale));
  canvas.height = Math.max(1, Math.round(bitmap.height * scale));
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('تعذر تجهيز الصورة');
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  return { base64: canvas.toDataURL('image/png'), extension: 'png' };
};

const loadLogo = async () => {
  try {
    const response = await fetch('/platform-logo.png', { cache: 'force-cache' });
    if (!response.ok) return null;
    return await prepareExcelImage(await response.blob());
  } catch {
    return null;
  }
};

const downloadBlob = (blob: Blob, fileName: string) => {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = fileName;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 30_000);
};

const styleStatusCell = (cell: ExcelJS.Cell) => {
  const value = String(cell.value ?? '');
  if (/مرفوض|عاجل|متأخر|حرج/.test(value)) cell.fill = fill(palette.redSoft);
  else if (/معتمد|مكتمل|مغلق|تمت المعالجة|سليم|نشط/.test(value)) cell.fill = fill(palette.greenSoft);
  else if (/تحت المراجعة|قيد|يحتاج|معلقة|مجدولة/.test(value)) cell.fill = fill(palette.amberSoft);
};

export const writeProfessionalExcel = async (
  legacyWorkbook: XLSX.WorkBook,
  fileName: string,
  options: ProfessionalExcelOptions = {},
) => {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'IAU Deeds — وحدة العناية بالمساجد والمصليات الجامعية';
  workbook.created = new Date();
  workbook.modified = new Date();
  workbook.subject = options.title || 'تقرير وحدة العناية بالمساجد والمصليات الجامعية';
  workbook.company = 'جامعة الإمام عبدالرحمن بن فيصل';

  const logo = await loadLogo();
  const generatedAt = new Date().toLocaleString('ar-SA-u-ca-gregory');

  for (const sheetName of legacyWorkbook.SheetNames) {
    const source = legacyWorkbook.Sheets[sheetName];
    const matrix = XLSX.utils.sheet_to_json<unknown[]>(source, { header: 1, raw: true, defval: '' });
    const sourceHeaders = (matrix[0] || ['البيانات']).map((value) => String(value || 'البيانات'));
    const sourceRows = matrix.slice(1);
    const media = isMediaSheet(sheetName, sourceHeaders);
    const headers = media ? [...sourceHeaders, 'معاينة الصورة'] : sourceHeaders;
    const columnCount = Math.max(1, headers.length);

    const ws = workbook.addWorksheet(safeSheetName(sheetName), {
      views: [{ rightToLeft: true, showGridLines: false }],
      properties: { defaultRowHeight: 22 },
      pageSetup: {
        paperSize: 9,
        orientation: options.orientation || (columnCount > 7 ? 'landscape' : 'portrait'),
        fitToPage: true,
        fitToWidth: 1,
        fitToHeight: 0,
        horizontalCentered: true,
      },
      pageMargins: { left: 0.25, right: 0.25, top: 0.45, bottom: 0.45, header: 0.2, footer: 0.2 },
    });

    ws.mergeCells(1, 1, 1, columnCount);
    const unitCell = ws.getCell(1, 1);
    unitCell.value = 'جامعة الإمام عبدالرحمن بن فيصل — وحدة العناية بالمساجد والمصليات الجامعية';
    unitCell.font = { name: 'Arial', size: 10, bold: true, color: { argb: palette.teal } };
    unitCell.alignment = { horizontal: 'right', vertical: 'middle' };
    ws.getRow(1).height = 21;

    ws.mergeCells(2, 1, 2, columnCount);
    const titleCell = ws.getCell(2, 1);
    titleCell.value = options.title ? `${options.title} — ${sheetName}` : sheetName;
    titleCell.font = { name: 'Arial', size: 18, bold: true, color: { argb: palette.white } };
    titleCell.fill = fill(palette.navy);
    titleCell.alignment = { horizontal: 'right', vertical: 'middle' };
    ws.getRow(2).height = 34;

    ws.mergeCells(3, 1, 3, columnCount);
    const metaCell = ws.getCell(3, 1);
    metaCell.value = [options.subtitle, `تاريخ الاستخراج: ${generatedAt}`].filter(Boolean).join(' | ');
    metaCell.font = { name: 'Arial', size: 9, color: { argb: palette.muted } };
    metaCell.fill = fill(palette.slateSoft);
    metaCell.alignment = { horizontal: 'right', vertical: 'middle', wrapText: true };
    ws.getRow(3).height = 24;

    let cursor = 4;
    if (options.filters) {
      ws.mergeCells(cursor, 1, cursor, columnCount);
      const filterCell = ws.getCell(cursor, 1);
      filterCell.value = `معايير التقرير: ${options.filters}`;
      filterCell.font = { name: 'Arial', size: 9, bold: true, color: { argb: palette.sky } };
      filterCell.fill = fill(palette.blueSoft);
      filterCell.alignment = { horizontal: 'right', vertical: 'middle', wrapText: true };
      ws.getRow(cursor).height = 25;
      cursor += 1;
    }

    if (options.metrics?.length) {
      const metrics = options.metrics;
      const cellsPerMetric = Math.max(1, Math.floor(columnCount / Math.min(metrics.length, columnCount)));
      let col = 1;
      for (const metric of metrics) {
        if (col > columnCount) break;
        const end = Math.min(columnCount, col + cellsPerMetric - 1);
        if (end > col) ws.mergeCells(cursor, col, cursor, end);
        const cell = ws.getCell(cursor, col);
        cell.value = `${metric.label}\n${metric.value}`;
        cell.font = { name: 'Arial', size: 10, bold: true, color: { argb: palette.text } };
        cell.fill = fill(toneFill(metric.tone));
        cell.border = thinBorder;
        cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
        col = end + 1;
      }
      ws.getRow(cursor).height = 38;
      cursor += 2;
    } else {
      cursor += 1;
    }

    const headerRowNumber = cursor;
    const headerRow = ws.getRow(headerRowNumber);
    headers.forEach((header, index) => {
      const cell = headerRow.getCell(index + 1);
      cell.value = header;
      cell.font = { name: 'Arial', size: 10, bold: true, color: { argb: palette.white } };
      cell.fill = fill(palette.sky);
      cell.border = thinBorder;
      cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    });
    headerRow.height = 28;

    const linkColumn = sourceHeaders.findIndex((header) => header === 'الرابط');
    const fileIdColumn = sourceHeaders.findIndex((header) => header === 'معرف الملف');
    const mimeColumn = sourceHeaders.findIndex((header) => header === 'نوع الملف');
    const fileNameColumn = sourceHeaders.findIndex((header) => header === 'اسم الملف');

    for (let rowIndex = 0; rowIndex < sourceRows.length; rowIndex += 1) {
      const sourceRow = sourceRows[rowIndex] || [];
      const excelRowNumber = headerRowNumber + 1 + rowIndex;
      const row = ws.getRow(excelRowNumber);
      for (let colIndex = 0; colIndex < sourceHeaders.length; colIndex += 1) {
        const cell = row.getCell(colIndex + 1);
        const value = normalizeValue(sourceRow[colIndex]);
        const text = String(value ?? '').trim();
        if (/^https?:\/\//i.test(text)) {
          cell.value = { text: 'فتح الرابط', hyperlink: text, tooltip: 'فتح الصورة / المرفق' };
          cell.font = { name: 'Arial', size: 9, color: { argb: 'FF0563C1' }, underline: true };
        } else {
          cell.value = value as ExcelJS.CellValue;
          cell.font = { name: 'Arial', size: 9, color: { argb: palette.text } };
        }
        cell.border = thinBorder;
        cell.alignment = { horizontal: typeof value === 'number' ? 'center' : 'right', vertical: 'middle', wrapText: true };
        if (rowIndex % 2 === 1 && !cell.fill) cell.fill = fill('FFF8FBFD');
        styleStatusCell(cell);
      }
      row.height = media ? 84 : 23;

      if (media) {
        const previewCell = row.getCell(headers.length);
        previewCell.value = '—';
        previewCell.border = thinBorder;
        previewCell.alignment = { horizontal: 'center', vertical: 'middle' };
        const url = linkColumn >= 0 ? String(sourceRow[linkColumn] || '') : '';
        const fileId = fileIdColumn >= 0 ? String(sourceRow[fileIdColumn] || '') : '';
        const mimeType = mimeColumn >= 0 ? String(sourceRow[mimeColumn] || '') : '';
        const fileNameValue = fileNameColumn >= 0 ? String(sourceRow[fileNameColumn] || '') : '';
        if (looksLikeImage(mimeType, fileNameValue, url)) {
          try {
            let blob: Blob | null = null;
            if (options.imageLoader) blob = await options.imageLoader(fileId && fileId !== '-' ? fileId : undefined, url && url !== '-' ? url : undefined, mimeType);
            if (!blob && /^https?:\/\//i.test(url)) {
              const response = await fetch(url);
              if (response.ok) blob = await response.blob();
            }
            if (blob) {
              const image = await prepareExcelImage(blob);
              const imageId = workbook.addImage({ base64: image.base64, extension: image.extension });
              ws.addImage(imageId, {
                tl: { col: headers.length - 1 + 0.12, row: excelRowNumber - 1 + 0.12 },
                br: { col: headers.length - 0.12, row: excelRowNumber - 0.12 },
                editAs: 'oneCell',
              });
              previewCell.value = '';
            }
          } catch {
            previewCell.value = 'الرابط متاح';
          }
        }
      }
    }

    const widths = headers.map((header, columnIndex) => {
      if (header === 'معاينة الصورة') return 24;
      const samples = sourceRows.slice(0, 180).map((row) => String(row?.[columnIndex] ?? '').replace(/\n/g, ' ').length);
      const max = Math.max(header.length, ...samples, 8);
      if (/ملاحظة|وصف|الإجراء|الموقع/.test(header)) return Math.min(42, Math.max(18, max + 2));
      if (/الرابط|معرف الملف/.test(header)) return 18;
      return Math.min(28, Math.max(11, max + 2));
    });
    ws.columns = widths.map((width) => ({ width }));

    const lastDataRow = Math.max(headerRowNumber, headerRowNumber + sourceRows.length);
    ws.autoFilter = { from: { row: headerRowNumber, column: 1 }, to: { row: lastDataRow, column: sourceHeaders.length } };
    ws.views = [{ state: 'frozen', ySplit: headerRowNumber, rightToLeft: true, showGridLines: false }];
    ws.pageSetup.printTitlesRow = `${headerRowNumber}:${headerRowNumber}`;
    ws.headerFooter.oddFooter = '&Rمنصة IAU Deeds — وحدة العناية بالمساجد والمصليات&Lصفحة &P من &N';

    if (logo) {
      try {
        const imageId = workbook.addImage({ base64: logo.base64, extension: logo.extension });
        ws.addImage(imageId, { tl: { col: Math.max(0, columnCount - 1.0), row: 0.08 }, ext: { width: 42, height: 42 }, editAs: 'oneCell' });
      } catch { /* logo is optional */ }
    }
  }

  const buffer = await workbook.xlsx.writeBuffer();
  downloadBlob(new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }), fileName);
};
