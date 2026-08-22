import type { ModelBWorkbookRow, ModelBSheetInspection } from './fixedAssetModelBWorkbook';
import type {
  StructuralAccountingIntakeRow,
  StructuralAccountingWorkbookInspection,
} from './accountingWorkbookStructuralIntake';
import type { AccountingExcelTemplateDetection } from './accountingExcelTemplateProfiles';

export type AccountingWorkbookWorkerResult = {
  inspection: StructuralAccountingWorkbookInspection;
  templateDetection: AccountingExcelTemplateDetection;
  modelBSheets: ModelBSheetInspection[];
  modelBRows: ModelBWorkbookRow[];
  legacyRows: StructuralAccountingIntakeRow[];
};

type AnalyzeOptions = {
  sourceBuffer: ArrayBuffer;
  officialBuffer?: ArrayBuffer;
  signal?: AbortSignal;
  onProgress?: (message: string) => void;
};

export const analyzeAccountingWorkbookOffThread = ({
  sourceBuffer,
  officialBuffer,
  signal,
  onProgress,
}: AnalyzeOptions): Promise<AccountingWorkbookWorkerResult> => new Promise((resolve, reject) => {
  const worker = new Worker(new URL('../workers/accountingWorkbookImport.worker.ts', import.meta.url), { type: 'module' });
  let settled = false;

  const finish = (callback: () => void) => {
    if (settled) return;
    settled = true;
    worker.terminate();
    signal?.removeEventListener('abort', handleAbort);
    callback();
  };

  const handleAbort = () => finish(() => reject(new DOMException('تم إلغاء تحليل ملف Excel.', 'AbortError')));
  if (signal?.aborted) return handleAbort();
  signal?.addEventListener('abort', handleAbort, { once: true });

  worker.onmessage = (event: MessageEvent<any>) => {
    const data = event.data || {};
    if (data.type === 'progress') {
      onProgress?.(String(data.message || 'جاري تحليل الملف...'));
      return;
    }
    if (data.type === 'done') {
      finish(() => resolve(data.result as AccountingWorkbookWorkerResult));
      return;
    }
    if (data.type === 'error') {
      finish(() => reject(new Error(String(data.message || 'تعذر تحليل ملف Excel.'))));
    }
  };

  worker.onerror = (event) => {
    finish(() => reject(new Error(event.message || 'حدث خطأ في محرك تحليل Excel.')));
  };

  const transfer: Transferable[] = [sourceBuffer];
  if (officialBuffer) transfer.push(officialBuffer);
  worker.postMessage({ sourceBuffer, officialBuffer }, transfer);
});
