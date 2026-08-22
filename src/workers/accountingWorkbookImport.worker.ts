/// <reference lib="webworker" />

import * as XLSX from 'xlsx';
import { inspectModelBWorkbook, parseModelBWorkbook } from '../utils/fixedAssetModelBWorkbook';
import {
  inspectAccountingWorkbookStructure,
  parseAccountingWorkbookStructure,
} from '../utils/accountingWorkbookStructuralIntake';
import {
  accountingSheetRoleIsData,
  detectAccountingExcelTemplateProfile,
} from '../utils/accountingExcelTemplateProfiles';

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

    progress('جاري تحديد نوع قالب Excel ووظيفة كل ورقة...');
    const templateDetection = detectAccountingExcelTemplateProfile(workbook);
    const sheetProfileByName = new Map(templateDetection.sheets.map((sheet) => [sheet.sheetName, sheet]));

    progress(`تم التعرف على: ${templateDetection.profileName} — ثقة ${templateDetection.confidence}%`);
    const inspection = inspectAccountingWorkbookStructure(workbook, officialWorkbook);

    // Model B is parsed only from sheets classified as actual fixed-asset data.
    // Reference/lookup sheets are never converted to records, even if some labels overlap.
    const modelBSheets = templateDetection.safeForAutomaticImport
      ? inspectModelBWorkbook(workbook).filter((sheet) => sheetProfileByName.get(sheet.sheetName)?.role === 'data-fixed-asset')
      : [];
    const modelBSheetNames = new Set(modelBSheets.map((sheet) => sheet.sheetName));

    progress('جاري تحويل أوراق البيانات فقط إلى المخطط الموحد دون تجميد الصفحة...');
    const modelBRows = parseModelBWorkbook(workbook, modelBSheets);

    const legacyInspection = {
      ...inspection,
      sheets: templateDetection.safeForAutomaticImport
        ? inspection.sheets.filter((sheet) => {
            if (modelBSheetNames.has(sheet.sheetName)) return false;
            const profile = sheetProfileByName.get(sheet.sheetName);
            if (!profile || !accountingSheetRoleIsData(profile.role)) return false;
            if (profile.role === 'data-land') return sheet.recordType === 'land';
            if (profile.role === 'data-building') return sheet.recordType === 'building';
            return false;
          })
        : [],
    };
    const legacyRows = parseAccountingWorkbookStructure(workbook, legacyInspection);

    scope.postMessage({
      type: 'done',
      result: {
        inspection,
        templateDetection,
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
