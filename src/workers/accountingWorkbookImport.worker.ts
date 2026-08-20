/// <reference lib="webworker" />

import * as XLSX from 'xlsx';
import { inspectModelBWorkbook, parseModelBWorkbook } from '../utils/fixedAssetModelBWorkbook';
import {
  inspectAccountingWorkbookStructure,
  parseAccountingWorkbookStructure,
} from '../utils/accountingWorkbookStructuralIntake';

type AnalyzeRequest = {
  sourceBuffer: ArrayBuffer;
  officialBuffer?: ArrayBuffer;
};

const scope = self as DedicatedWorkerGlobalScope;

const progress = (message: string) => scope.postMessage({ type: 'progress', message });

scope.onmessage = async (event: MessageEvent<AnalyzeRequest>) => {
  try {
    progress('جاري فتح ملف Excel في محرك معالجة مستقل...');
    const workbook = XLSX.read(event.data.sourceBuffer, {
      type: 'array',
      cellDates: false,
      cellStyles: false,
      cellHTML: false,
    });

    let officialWorkbook: XLSX.WorkBook | undefined;
    if (event.data.officialBuffer) {
      progress('جاري تجهيز المخطط الرسمي المرجعي للمطابقة...');
      officialWorkbook = XLSX.read(event.data.officialBuffer, {
        type: 'array',
        cellDates: false,
        cellStyles: false,
        cellHTML: false,
      });
    }

    progress('جاري التعرف على أوراق نموذج ب والأوراق الانتقالية...');
    const modelBSheets = inspectModelBWorkbook(workbook);
    const modelBSheetNames = new Set(modelBSheets.map((sheet) => sheet.sheetName));
    const inspection = inspectAccountingWorkbookStructure(workbook, officialWorkbook);

    progress('جاري تحويل السجلات إلى المخطط الموحد دون تجميد الصفحة...');
    const modelBRows = parseModelBWorkbook(workbook, modelBSheets);
    const legacyInspection = {
      ...inspection,
      sheets: inspection.sheets.filter((sheet) => !modelBSheetNames.has(sheet.sheetName)),
    };
    const legacyRows = parseAccountingWorkbookStructure(workbook, legacyInspection);

    scope.postMessage({
      type: 'done',
      result: {
        inspection,
        modelBSheets,
        modelBRows,
        legacyRows,
      },
    });
  } catch (error) {
    scope.postMessage({
      type: 'error',
      message: error instanceof Error ? error.message : 'تعذر تحليل ملف Excel.',
    });
  }
};

export {};
