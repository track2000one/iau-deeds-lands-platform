import * as XLSX from 'xlsx';

export type ExcelReportRow = Record<string, unknown>;

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
