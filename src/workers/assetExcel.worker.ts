/// <reference lib="webworker" />

import { parseOfficialAssetExcel } from '../utils/assetExcelImport';

type Request = {
  id: string;
  fileName: string;
  mimeType?: string;
  buffer: ArrayBuffer;
};

self.onmessage = async (event: MessageEvent<Request>) => {
  const { id, fileName, mimeType, buffer } = event.data;
  try {
    const file = new File([buffer], fileName, { type: mimeType || 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const result = await parseOfficialAssetExcel(file);
    self.postMessage({ id, ok: true, result });
  } catch (error) {
    self.postMessage({ id, ok: false, error: error instanceof Error ? error.message : 'تعذر تحليل ملف الأصول' });
  }
};
