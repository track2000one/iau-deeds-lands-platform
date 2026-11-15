import ExcelJS from 'exceljs';
import type { AccountingTransformationRecord } from '../../types/accountingTransformation';

type AccountingExcelField<Key extends string> = {
  key: Key;
  label: string;
};

type AccountingStyledExcelOptions<Key extends string> = {
  items: AccountingTransformationRecord[];
  fields: AccountingExcelField<Key>[];
  displayValue: (item: AccountingTransformationRecord, key: Key) => string;
  universityName: string;
  departmentName: string;
  reportTitle: string;
  statementTitle: string;
  cycleLabel: string;
  recordTypeLabel: string;
  groupLabel: string;
  scopeLabel: string;
  sortLabel: string;
  sortDirection: 'asc' | 'desc';
  paperSize: 'A4' | 'A3';
  pageOrientation: 'portrait' | 'landscape';
  fontSize: number;
};

const NAVY = 'FF0D3156';
const BLUE = 'FF1F4E79';
const PALE = 'FFF3F7FC';
const LINE = 'FFDCE5EF';
const TEXT = 'FF1F2937';
const MUTED = 'FF64748B';

const percentFields = new Set([
  'censusProgress', 'inventoryProgress', 'valuationProgress', 'overallProgress',
]);

const widthFor = (field: string): number => {
  if (field === 'assetDescription') return 45;
  if (field === 'buildingCoordinates') return 34;
  if (field === 'buildingLocation' || field === 'buildingNationalAddress') return 35;
  if (field === 'buildingUniqueNumber') return 28;
  if (field === 'buildingNumber' || field === 'buildingCardNumber') return 22;
  if (field === 'buildingArea' || field === 'buildingLandArea') return 22;
  if (field === 'entityName' || field === 'accountingGroup') return 30;
  if (field === 'recordNumber' || field === 'accountingAssetCode' || field === 'entityAssetNumber') return 24;
  if (field === 'createdAt' || field === 'updatedAt') return 25;
  if (field === 'createdBy' || field === 'updatedBy') return 28;
  if (field === 'committeeStatus' || field === 'recordType') return 22;
  if (percentFields.has(field)) return 17;
  return 21;
};

const safeText = (value: string): string => value.replace(/[\u0000-\u0008\u000B-\u001F\u007F]/g, '').slice(0, 32500);

/**
 * Excel equivalent of the committee PDF: the caller supplies the exact same
 * ordered, filtered records, selected columns and report metadata.
 * No server-side changes, extra record queries or imported data mutations.
 */
export async function buildAccountingStyledExcel<Key extends string>(options: AccountingStyledExcelOptions<Key>): Promise<Uint8Array> {
  if (!options.fields.length || !options.items.length) throw new Error('لا توجد سجلات أو أعمدة لإنشاء التقرير.');

  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'منصة إدارة الصكوك والأراضي';
  workbook.subject = 'لجنة متابعة متطلبات التحول المحاسبي';
  workbook.title = safeText(options.reportTitle);
  workbook.created = new Date();

  const sheet = workbook.addWorksheet('التقرير المنسق', {
    properties: { defaultRowHeight: 24, tabColor: { argb: BLUE } },
    views: [{ state: 'frozen', xSplit: 0, ySplit: 9, rightToLeft: true }],
  });
  const columnCount = options.fields.length + 1;
  const lastColumn = sheet.getColumn(columnCount).letter;
  sheet.columns = [{ key: 'ordinal', width: 9 }, ...options.fields.map(({ key }) => ({ key, width: widthFor(key) }))];
  const dataHeaderRow = 9;

  const mergedBanner = (
    rowNumber: number,
    content: string,
    style: { fill?: string; color?: string; bold?: boolean; size?: number; height?: number } = {},
  ) => {
    sheet.mergeCells(`A${rowNumber}:${lastColumn}${rowNumber}`);
    const row = sheet.getRow(rowNumber);
    row.height = style.height || 26;
    const cell = row.getCell(1);
    cell.value = safeText(content);
    cell.font = { name: 'Arial', size: style.size || 11, bold: style.bold ?? false, color: { argb: style.color || TEXT } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: style.fill || 'FFFFFFFF' } };
    cell.alignment = { horizontal: 'center', vertical: 'middle', readingOrder: 'rtl', wrapText: true };
    cell.border = { bottom: { style: 'thin', color: { argb: LINE } } };
  };

  mergedBanner(1, options.universityName, { fill: NAVY, color: 'FFFFFFFF', bold: true, size: 15, height: 35 });
  mergedBanner(2, options.departmentName, { color: MUTED, size: 10, height: 25 });
  mergedBanner(3, options.reportTitle, { fill: PALE, color: NAVY, bold: true, size: 15, height: 37 });
  mergedBanner(4, options.statementTitle, { color: BLUE, bold: true, size: 12, height: 29 });
  mergedBanner(5, `الدورة: ${options.cycleLabel}  |  النوع: ${options.recordTypeLabel}`, { fill: PALE, size: 10 });
  mergedBanner(6, `المجموعة: ${options.groupLabel}  |  نطاق التقرير: ${options.scopeLabel}`, { size: 10 });
  mergedBanner(7, `إجمالي السجلات: ${options.items.length.toLocaleString('ar-SA')}  |  تاريخ التقرير: ${new Date().toLocaleString('ar-SA')}`, { fill: PALE, size: 10 });
  mergedBanner(8, `الفرز: ${options.sortLabel} (${options.sortDirection === 'asc' ? 'تصاعدي' : 'تنازلي'})`, { size: 10 });

  const header = sheet.getRow(dataHeaderRow);
  header.height = 34;
  [ 'م', ...options.fields.map((field) => field.label) ].forEach((label, index) => {
    const cell = header.getCell(index + 1);
    cell.value = label;
    cell.font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: NAVY } };
    cell.alignment = { horizontal: 'center', vertical: 'middle', readingOrder: 'rtl', wrapText: true };
    cell.border = { top: { style: 'thin', color: { argb: LINE } }, bottom: { style: 'thin', color: { argb: LINE } }, left: { style: 'thin', color: { argb: LINE } }, right: { style: 'thin', color: { argb: LINE } } };
  });

  const areaFields = new Set(['buildingArea', 'buildingLandArea']);
  const formattedArea = (value: string): string | number => {
    const compact = value.trim().replace(/[,،\s]/g, '');
    return /^\d+(?:\.\d+)?$/.test(compact) && Number.isFinite(Number(compact))
      ? Number(compact)
      : value;
  };

  options.items.forEach((item, index) => {
    const row = sheet.getRow(dataHeaderRow + 1 + index);
    row.height = options.fields.some(({ key }) => key === 'assetDescription') ? 32 : 26;
    const values: Array<{ key: string; value: string | number }> = [
      { key: 'ordinal', value: index + 1 },
      ...options.fields.map((field) => ({
        key: field.key,
        value: percentFields.has(field.key)
          ? Number(item[field.key as keyof AccountingTransformationRecord] || 0)
          : areaFields.has(field.key)
            ? formattedArea(safeText(options.displayValue(item, field.key)))
            : safeText(options.displayValue(item, field.key)),
      })),
    ];
    values.forEach(({ key, value }, columnIndex) => {
      const cell = row.getCell(columnIndex + 1);
      cell.value = value;
      if (percentFields.has(key)) cell.numFmt = '0"%"';
      if (areaFields.has(key) && typeof value === 'number') cell.numFmt = '#,##0.##';
      cell.font = { name: 'Arial', size: options.fontSize, color: { argb: TEXT }, bold: key === 'ordinal' };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: index % 2 ? PALE : 'FFFFFFFF' } };
      cell.alignment = { vertical: 'middle', horizontal: key === 'assetDescription' ? 'right' : 'center', wrapText: true, readingOrder: 'rtl' };
      cell.border = { top: { style: 'hair', color: { argb: LINE } }, bottom: { style: 'hair', color: { argb: LINE } }, left: { style: 'hair', color: { argb: LINE } }, right: { style: 'hair', color: { argb: LINE } } };
      if (key === 'committeeStatus' && item.committeeStatus === 'needs_update') {
        cell.font = { name: 'Arial', size: options.fontSize, bold: true, color: { argb: 'FF92400E' } };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFF3D6' } };
      }
    });
  });

  const lastDataRow = dataHeaderRow + options.items.length;
  sheet.autoFilter = { from: { row: dataHeaderRow, column: 1 }, to: { row: lastDataRow, column: columnCount } };
  sheet.printTitlesRow = `1:${dataHeaderRow}`;
  sheet.pageSetup = {
    paperSize: options.paperSize === 'A3' ? 8 : 9,
    orientation: options.pageOrientation,
    fitToPage: true,
    fitToWidth: 1,
    fitToHeight: 0,
    horizontalCentered: true,
    printArea: `A1:${lastColumn}${lastDataRow}`,
    margins: { left: 0.25, right: 0.25, top: 0.42, bottom: 0.5, header: 0.16, footer: 0.2 },
  };
  sheet.headerFooter.oddFooter = '&Lلجنة متابعة متطلبات التحول المحاسبي&Cتاريخ التقرير: &D&Rالصفحة &P من &N';
  const output = await workbook.xlsx.writeBuffer();
  return new Uint8Array(output);
}
