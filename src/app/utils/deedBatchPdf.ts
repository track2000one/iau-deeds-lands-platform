import { PDFDocument } from 'pdf-lib';
import type { Deed } from '../../types/deed';
import { isApiEnabled } from '../../lib/api';
import { authenticatedFetch } from '../../lib/http';

type BatchAttachment = {
  id?: string;
  entityType?: string;
  entityId?: string;
  attachmentType?: string;
  title?: string | null;
  driveUrl?: string | null;
  driveFileId?: string | null;
  mimeType?: string | null;
  fileUrl?: string | null;
  fileName?: string | null;
  originalName?: string | null;
  fileType?: string | null;
  localPath?: string | null;
};

export type DeedBatchPdfProgress = {
  phase: 'collecting' | 'rendering';
  current: number;
  total: number;
  label: string;
};

export type DeedBatchPdfOptions = {
  includeCover?: boolean;
  includeHeaders?: boolean;
  fileName?: string;
  scopeLabel?: string;
  signal?: AbortSignal;
  onProgress?: (progress: DeedBatchPdfProgress) => void;
};

export type DeedBatchPdfResult = {
  fileName: string;
  deedCount: number;
  documentCount: number;
  pageCount: number;
  pdfCount: number;
  imageCount: number;
  skippedDeeds: number;
  skippedDocuments: number;
  skippedImages: number;
};

const A4_WIDTH = 595.28;
const A4_HEIGHT = 841.89;

const getAttachmentUrl = (attachment: BatchAttachment) =>
  attachment.driveUrl || attachment.fileUrl || '';

const getAttachmentMime = (attachment: BatchAttachment) =>
  String(attachment.mimeType || attachment.fileType || '').toLowerCase();

const getAttachmentName = (attachment: BatchAttachment) =>
  String(
    attachment.title
      || attachment.originalName
      || attachment.fileName
      || 'مستند صك'
  );

const getDriveFileId = (attachment: BatchAttachment) => {
  if (attachment.driveFileId) return String(attachment.driveFileId);

  const url = getAttachmentUrl(attachment);
  if (!url) return '';

  try {
    const parsed = new URL(url);
    const queryId = parsed.searchParams.get('id');
    if (queryId) return queryId;
  } catch {
    // Continue to path matching.
  }

  return String(url).match(/\/(?:file\/d|d)\/([^/?#]+)/)?.[1] || '';
};

const isProbablyPdfAttachment = (attachment: BatchAttachment) => {
  const mime = getAttachmentMime(attachment);
  const name = getAttachmentName(attachment);
  const url = getAttachmentUrl(attachment);

  return (
    mime.includes('pdf')
    || /\.pdf(?:$|[?#])/i.test(name)
    || /\.pdf(?:$|[?#])/i.test(url)
  );
};

const isProbablyImageAttachment = (attachment: BatchAttachment) => {
  if (isProbablyPdfAttachment(attachment)) return false;

  const mime = getAttachmentMime(attachment);
  if (mime.startsWith('image/')) return true;

  const name = getAttachmentName(attachment);
  const url = getAttachmentUrl(attachment);
  if (
    /\.(png|jpe?g|webp|gif|bmp)(?:$|[?#])/i.test(name)
    || /\.(png|jpe?g|webp|gif|bmp)(?:$|[?#])/i.test(url)
  ) {
    return true;
  }

  return Boolean(getDriveFileId(attachment) || url);
};

const isExcludedDeedAttachmentType = (attachment: BatchAttachment) => {
  const type = String(attachment.attachmentType || '').toLowerCase();
  return [
    'plan_image',
    'location_image',
    'contract_image',
    'delivery_minutes',
    'inspection_image',
  ].includes(type);
};

const getPrintableDeedDocuments = (attachments: BatchAttachment[]) => {
  const explicit = attachments.filter((attachment) => {
    const type = String(attachment.attachmentType || '').toLowerCase();
    return ['deed_image', 'deed'].includes(type) && Boolean(getAttachmentUrl(attachment));
  });
  if (explicit.length) return explicit;

  // Compatibility with old records whose deed document was saved as "other".
  return attachments.filter((attachment) => {
    if (isExcludedDeedAttachmentType(attachment)) return false;
    if (!getAttachmentUrl(attachment)) return false;

    const type = String(attachment.attachmentType || '').toLowerCase();
    const title = getAttachmentName(attachment).trim();

    return (
      type === 'other'
      || !type
      || isProbablyPdfAttachment(attachment)
      || isProbablyImageAttachment(attachment)
      || /صك|deed|وثيقة\s*الملكية|ملكية/i.test(title)
    );
  });
};

const dedupeAttachments = (attachments: BatchAttachment[]) => {
  const seen = new Set<string>();
  return attachments.filter((attachment) => {
    const key = String(
      attachment.id
      || getAttachmentUrl(attachment)
      || `${attachment.attachmentType || ''}:${getAttachmentName(attachment)}`
    );

    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

const getLegacyStoredAttachments = (deed: Deed): BatchAttachment[] => {
  try {
    const raw = window.localStorage.getItem('deeds_data');
    if (!raw) return [];

    const records = JSON.parse(raw);
    if (!Array.isArray(records)) return [];

    const normalizedNumber = String(deed.deedNumber || '').replace(/\s+/g, '');
    const match = records.find((record: any) =>
      String(record?.id || '') === String(deed.id)
      || (
        normalizedNumber
        && String(record?.deedNumber || '').replace(/\s+/g, '') === normalizedNumber
      )
    );

    return Array.isArray(match?.attachments)
      ? (match.attachments as BatchAttachment[])
      : [];
  } catch {
    return [];
  }
};

const getBatchAttachmentManifest = async (
  deeds: Deed[],
  signal?: AbortSignal
): Promise<Map<string, BatchAttachment[]> | null> => {
  if (!isApiEnabled || !deeds.length) return null;

  try {
    const response = await authenticatedFetch('/api/attachments/deed-batch-manifest', {
      method: 'POST',
      cache: 'no-store',
      headers: {
        'Cache-Control': 'no-cache, no-store, max-age=0',
        Pragma: 'no-cache',
      },
      body: JSON.stringify({ deedIds: deeds.map((deed) => deed.id) }),
      signal,
    });

    const body = await response.json().catch(() => ({}));
    if (!response.ok || !body?.grouped || typeof body.grouped !== 'object') {
      return null;
    }

    const manifest = new Map<string, BatchAttachment[]>();
    for (const deed of deeds) {
      const items = Array.isArray(body.grouped[deed.id])
        ? (body.grouped[deed.id] as BatchAttachment[])
        : [];
      manifest.set(deed.id, items);
    }

    return manifest;
  } catch (error) {
    if (signal?.aborted) throw error;
    return null;
  }
};

const getDeedAttachments = async (
  deed: Deed,
  signal?: AbortSignal
): Promise<BatchAttachment[]> => {
  if (signal?.aborted) {
    throw new DOMException('تم إلغاء إنشاء ملف PDF', 'AbortError');
  }

  const inline = Array.isArray(deed.attachments)
    ? (deed.attachments as unknown as BatchAttachment[])
    : [];

  if (!isApiEnabled) return dedupeAttachments(inline);

  const response = await authenticatedFetch(
    `/api/attachments/deed/${encodeURIComponent(deed.id)}?batchPdf=1&ts=${Date.now()}`,
    {
      method: 'GET',
      cache: 'no-store',
      headers: {
        'Cache-Control': 'no-cache, no-store, max-age=0',
        Pragma: 'no-cache',
      },
      signal,
    }
  );

  const body = await response.json().catch(() => []);
  if (!response.ok) {
    throw new Error(
      (body as any)?.message
      || `تعذر قراءة مستندات الصك ${deed.deedNumber || ''}`
    );
  }

  const remote = Array.isArray(body) ? (body as BatchAttachment[]) : [];
  return dedupeAttachments([...remote, ...inline]);
};

const fetchDirectBlob = async (url: string, signal?: AbortSignal) => {
  const response = await fetch(url, {
    signal,
    mode: 'cors',
    cache: 'no-store',
  });

  if (!response.ok) {
    throw new Error(`تعذر تحميل المستند (HTTP ${response.status})`);
  }

  return response.blob();
};

const googleDriveThumbnailUrl = (attachment: BatchAttachment) => {
  const fileId = getDriveFileId(attachment);
  return fileId
    ? `https://drive.google.com/thumbnail?id=${encodeURIComponent(fileId)}&sz=w4000`
    : '';
};

const fetchAttachmentBlob = async (
  attachment: BatchAttachment,
  signal?: AbortSignal
) => {
  if (signal?.aborted) {
    throw new DOMException('تم إلغاء إنشاء ملف PDF', 'AbortError');
  }

  if (isApiEnabled && attachment.id) {
    try {
      const response = await authenticatedFetch(
        `/api/attachments/file/${encodeURIComponent(attachment.id)}/content?ts=${Date.now()}`,
        {
          method: 'GET',
          cache: 'no-store',
          headers: {
            'Cache-Control': 'no-cache, no-store, max-age=0',
            Pragma: 'no-cache',
          },
          signal,
        }
      );

      if (response.ok) {
        const blob = await response.blob();
        if (blob.size > 0) return blob;
      }
    } catch (error) {
      if (signal?.aborted) throw error;
    }
  }

  const url = getAttachmentUrl(attachment);
  if (url) {
    try {
      return await fetchDirectBlob(url, signal);
    } catch (error) {
      if (signal?.aborted) throw error;
    }
  }

  // Image-only last resort. This is intentionally not used for known PDFs
  // because a thumbnail would lose the remaining PDF pages.
  if (!isProbablyPdfAttachment(attachment)) {
    const thumbnail = googleDriveThumbnailUrl(attachment);
    if (thumbnail) return fetchDirectBlob(thumbnail, signal);
  }

  throw new Error(`تعذر الوصول إلى ${getAttachmentName(attachment)}`);
};

const loadImageFromBlob = (blob: Blob, signal?: AbortSignal) =>
  new Promise<HTMLImageElement>((resolve, reject) => {
    if (signal?.aborted) {
      reject(new DOMException('تم إلغاء إنشاء ملف PDF', 'AbortError'));
      return;
    }

    const objectUrl = URL.createObjectURL(blob);
    const image = new Image();

    const cleanup = () => {
      URL.revokeObjectURL(objectUrl);
      signal?.removeEventListener('abort', onAbort);
    };

    const onAbort = () => {
      cleanup();
      reject(new DOMException('تم إلغاء إنشاء ملف PDF', 'AbortError'));
    };

    signal?.addEventListener('abort', onAbort, { once: true });

    image.onload = () => {
      cleanup();
      resolve(image);
    };

    image.onerror = () => {
      cleanup();
      reject(new Error('صيغة الصورة غير مدعومة أو تعذر قراءتها'));
    };

    image.src = objectUrl;
  });

const dataUrlToBytes = (dataUrl: string) => {
  const base64 = dataUrl.split(',')[1] || '';
  const binary = window.atob(base64);
  const bytes = new Uint8Array(binary.length);

  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }

  return bytes;
};

const blobToOptimizedJpeg = async (blob: Blob, signal?: AbortSignal) => {
  const image = await loadImageFromBlob(blob, signal);
  const sourceWidth = image.naturalWidth || image.width;
  const sourceHeight = image.naturalHeight || image.height;

  if (!sourceWidth || !sourceHeight) {
    throw new Error('أبعاد الصورة غير صالحة');
  }

  const maxDimension = 3200;
  const scale = Math.min(1, maxDimension / Math.max(sourceWidth, sourceHeight));
  const width = Math.max(1, Math.round(sourceWidth * scale));
  const height = Math.max(1, Math.round(sourceHeight * scale));

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;

  const context = canvas.getContext('2d');
  if (!context) throw new Error('تعذر تجهيز الصورة للطباعة');

  context.fillStyle = '#ffffff';
  context.fillRect(0, 0, width, height);
  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = 'high';
  context.drawImage(image, 0, 0, width, height);

  return {
    bytes: dataUrlToBytes(canvas.toDataURL('image/jpeg', 0.95)),
    width,
    height,
  };
};

const createCover = (
  deedCount: number,
  documentCount: number,
  scopeLabel: string
) => {
  const canvas = document.createElement('canvas');
  canvas.width = 1400;
  canvas.height = 1980;

  const context = canvas.getContext('2d');
  if (!context) throw new Error('تعذر تجهيز غلاف الملف');

  const gradient = context.createLinearGradient(0, 0, 1400, 1980);
  gradient.addColorStop(0, '#f8fbfe');
  gradient.addColorStop(0.56, '#ffffff');
  gradient.addColorStop(1, '#eef7f5');

  context.fillStyle = gradient;
  context.fillRect(0, 0, canvas.width, canvas.height);

  context.fillStyle = '#0b4a3f';
  context.fillRect(0, 0, 1400, 42);
  context.fillStyle = '#123d73';
  context.fillRect(0, 42, 1400, 12);

  context.direction = 'rtl';
  context.textAlign = 'right';

  context.fillStyle = '#123d73';
  context.font = '700 58px Tahoma, Arial, sans-serif';
  context.fillText('جامعة الإمام عبدالرحمن بن فيصل', 1260, 205);

  context.fillStyle = '#486276';
  context.font = '600 38px Tahoma, Arial, sans-serif';
  context.fillText('إدارة أوقاف وأملاك الجامعة', 1260, 270);

  context.fillStyle = '#0b4a3f';
  context.font = '800 88px Tahoma, Arial, sans-serif';
  context.fillText('ملف مستندات الصكوك', 1260, 525);

  context.fillStyle = '#6a7d8f';
  context.font = '600 34px Tahoma, Arial, sans-serif';
  context.fillText(scopeLabel || 'جميع الصكوك', 1260, 590);

  const cards = [
    ['عدد الصكوك', deedCount.toLocaleString('ar-SA')],
    ['عدد مستندات الصكوك', documentCount.toLocaleString('ar-SA')],
    ['تاريخ إنشاء الملف', new Date().toLocaleDateString('ar-SA-u-ca-gregory')],
  ];

  let y = 820;
  for (const [label, value] of cards) {
    context.fillStyle = '#ffffff';
    context.strokeStyle = '#c9d9e5';
    context.lineWidth = 3;
    context.fillRect(170, y, 1060, 190);
    context.strokeRect(170, y, 1060, 190);

    context.textAlign = 'right';
    context.fillStyle = '#687e91';
    context.font = '600 34px Tahoma, Arial, sans-serif';
    context.fillText(label, 1150, y + 68);

    context.fillStyle = '#173f66';
    context.font = '800 62px Tahoma, Arial, sans-serif';
    context.fillText(value, 1150, y + 145);

    y += 235;
  }

  context.textAlign = 'center';
  context.fillStyle = '#8192a2';
  context.font = '500 28px Tahoma, Arial, sans-serif';
  context.fillText(
    'تم إنشاء الملف آليًا من منصة إدارة الصكوك والأراضي',
    700,
    1835
  );

  return dataUrlToBytes(canvas.toDataURL('image/jpeg', 0.96));
};

const createDeedSeparator = (
  deed: Deed,
  documentCount: number
) => {
  const canvas = document.createElement('canvas');
  canvas.width = 1400;
  canvas.height = 1980;

  const context = canvas.getContext('2d');
  if (!context) throw new Error('تعذر تجهيز صفحة بيانات الصك');

  context.fillStyle = '#ffffff';
  context.fillRect(0, 0, canvas.width, canvas.height);

  context.fillStyle = '#123d73';
  context.fillRect(0, 0, canvas.width, 34);

  context.direction = 'rtl';
  context.textAlign = 'right';

  context.fillStyle = '#64798b';
  context.font = '600 36px Tahoma, Arial, sans-serif';
  context.fillText('جامعة الإمام عبدالرحمن بن فيصل — إدارة أوقاف وأملاك الجامعة', 1240, 180);

  context.fillStyle = '#123d73';
  context.font = '800 92px Tahoma, Arial, sans-serif';
  context.fillText(`الصك رقم ${deed.deedNumber || '-'}`, 1240, 410);

  context.fillStyle = '#0b4a3f';
  context.font = '700 50px Tahoma, Arial, sans-serif';
  context.fillText(deed.propertyDescription || 'بيان العقار غير محدد', 1240, 520);

  const rows = [
    ['المدينة', deed.city || '-'],
    ['الحي', deed.district || '-'],
    ['رقم المخطط', deed.planNumber || '-'],
    ['رقم القطعة', deed.plotNumber || '-'],
    ['المساحة', deed.area ? `${Number(deed.area).toLocaleString('ar-SA')} م²` : '-'],
    ['عدد مستندات الصك', documentCount.toLocaleString('ar-SA')],
  ];

  let y = 750;
  for (const [label, value] of rows) {
    context.fillStyle = '#f6f9fb';
    context.strokeStyle = '#d6e0e8';
    context.lineWidth = 2;
    context.fillRect(170, y, 1060, 140);
    context.strokeRect(170, y, 1060, 140);

    context.fillStyle = '#718395';
    context.font = '600 31px Tahoma, Arial, sans-serif';
    context.fillText(label, 1160, y + 50);

    context.fillStyle = '#1e3e59';
    context.font = '700 39px Tahoma, Arial, sans-serif';
    context.fillText(String(value), 1160, y + 104);

    y += 162;
  }

  context.textAlign = 'center';
  context.fillStyle = '#8a99a7';
  context.font = '500 27px Tahoma, Arial, sans-serif';
  context.fillText('تبدأ مستندات هذا الصك في الصفحة التالية', 700, 1810);

  return dataUrlToBytes(canvas.toDataURL('image/jpeg', 0.95));
};

const addFullPageJpeg = async (
  pdf: PDFDocument,
  bytes: Uint8Array
) => {
  const image = await pdf.embedJpg(bytes);
  const page = pdf.addPage([A4_WIDTH, A4_HEIGHT]);

  page.drawImage(image, {
    x: 0,
    y: 0,
    width: A4_WIDTH,
    height: A4_HEIGHT,
  });
};

const addImageDocument = async (
  pdf: PDFDocument,
  blob: Blob,
  signal?: AbortSignal
) => {
  const image = await blobToOptimizedJpeg(blob, signal);
  const embedded = await pdf.embedJpg(image.bytes);
  const page = pdf.addPage([A4_WIDTH, A4_HEIGHT]);

  const margin = 26;
  const maxWidth = A4_WIDTH - margin * 2;
  const maxHeight = A4_HEIGHT - margin * 2;
  const scale = Math.min(
    maxWidth / embedded.width,
    maxHeight / embedded.height
  );

  const width = embedded.width * scale;
  const height = embedded.height * scale;

  page.drawImage(embedded, {
    x: (A4_WIDTH - width) / 2,
    y: (A4_HEIGHT - height) / 2,
    width,
    height,
  });

  return 1;
};

const hasPdfSignature = async (blob: Blob) => {
  try {
    const prefix = await blob.slice(0, 5).text();
    return prefix === '%PDF-';
  } catch {
    return false;
  }
};

const addPdfDocument = async (
  target: PDFDocument,
  blob: Blob
) => {
  const bytes = new Uint8Array(await blob.arrayBuffer());
  const source = await PDFDocument.load(bytes, {
    ignoreEncryption: false,
    updateMetadata: false,
  });

  const pageIndices = source.getPageIndices();
  const pages = await target.copyPages(source, pageIndices);

  for (const page of pages) {
    target.addPage(page);
  }

  return pages.length;
};

const sanitizeFileName = (value: string) => {
  const clean = value
    .trim()
    .replace(/[\\/:*?"<>|]+/g, '-')
    .replace(/\s+/g, ' ');

  return clean || 'ملف مستندات الصكوك';
};

const savePdfBytes = (bytes: Uint8Array, fileName: string) => {
  const blob = new Blob([bytes], { type: 'application/pdf' });
  const objectUrl = URL.createObjectURL(blob);
  const link = document.createElement('a');

  link.href = objectUrl;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();

  window.setTimeout(() => URL.revokeObjectURL(objectUrl), 15_000);
};

export const generateDeedImagesPdf = async (
  deeds: Deed[],
  options: DeedBatchPdfOptions = {}
): Promise<DeedBatchPdfResult> => {
  const includeCover = options.includeCover !== false;
  const includeHeaders = options.includeHeaders !== false;
  const signal = options.signal;

  if (!deeds.length) {
    throw new Error('لا توجد صكوك ضمن النطاق المحدد');
  }

  const collectedByDeed = new Map<number, BatchAttachment[]>();
  let skippedDeeds = 0;
  let nextDeedIndex = 0;
  let completedDeeds = 0;
  let totalAttachmentRecords = 0;

  const workerCount = Math.min(6, deeds.length);
  const batchManifest = await getBatchAttachmentManifest(deeds, signal);

  const collectWorker = async () => {
    while (true) {
      if (signal?.aborted) {
        throw new DOMException('تم إلغاء إنشاء ملف PDF', 'AbortError');
      }

      const index = nextDeedIndex;
      nextDeedIndex += 1;
      if (index >= deeds.length) return;

      const deed = deeds[index];

      try {
        const inline = Array.isArray(deed.attachments)
          ? (deed.attachments as unknown as BatchAttachment[])
          : [];
        const legacyStored = getLegacyStoredAttachments(deed);
        const remote = batchManifest
          ? (batchManifest.get(deed.id) || [])
          : await getDeedAttachments(deed, signal);

        const allAttachments = dedupeAttachments([
          ...remote,
          ...inline,
          ...legacyStored,
        ]);

        totalAttachmentRecords += allAttachments.length;

        const documents = getPrintableDeedDocuments(allAttachments);
        if (documents.length) {
          collectedByDeed.set(index, documents);
        } else {
          skippedDeeds += 1;
        }
      } catch (error) {
        if (signal?.aborted) throw error;
        skippedDeeds += 1;
      } finally {
        completedDeeds += 1;
        options.onProgress?.({
          phase: 'collecting',
          current: completedDeeds,
          total: deeds.length,
          label: `قراءة مستندات الصك ${deed.deedNumber || ''}`,
        });
      }
    }
  };

  await Promise.all(
    Array.from({ length: workerCount }, () => collectWorker())
  );

  const collected: Array<{
    deed: Deed;
    attachments: BatchAttachment[];
  }> = [];

  deeds.forEach((deed, deedIndex) => {
    const attachments = collectedByDeed.get(deedIndex) || [];
    if (attachments.length) {
      collected.push({ deed, attachments });
    }
  });

  if (!collected.length) {
    if (totalAttachmentRecords === 0) {
      throw new Error(
        `تم فحص ${deeds.length.toLocaleString('ar-SA')} صك، ولم يعثر النظام على أي مرفقات مرتبطة بها في قاعدة البيانات أو الحفظ المحلي.`
      );
    }

    throw new Error(
      `تم العثور على ${totalAttachmentRecords.toLocaleString('ar-SA')} مرفق، لكن لم يتم التعرف على أي منها كمستند صك قابل للتجميع.`
    );
  }

  const documentCount = collected.reduce(
    (sum, item) => sum + item.attachments.length,
    0
  );

  const pdf = await PDFDocument.create();
  pdf.setTitle('IAU Deeds Documents');
  pdf.setSubject('Combined deed documents');
  pdf.setAuthor('Imam Abdulrahman Bin Faisal University');
  pdf.setCreator('IAU Deeds Platform');

  if (includeCover) {
    await addFullPageJpeg(
      pdf,
      createCover(
        collected.length,
        documentCount,
        options.scopeLabel || 'جميع الصكوك'
      )
    );
  }

  let successfulDocuments = 0;
  let successfulPdfDocuments = 0;
  let successfulImageDocuments = 0;
  let copiedDocumentPages = 0;
  let skippedDocuments = 0;
  const successfulDeeds = new Set<string>();

  let renderIndex = 0;

  for (const item of collected) {
    if (signal?.aborted) {
      throw new DOMException('تم إلغاء إنشاء ملف PDF', 'AbortError');
    }

    let separatorAdded = false;

    for (const attachment of item.attachments) {
      renderIndex += 1;

      options.onProgress?.({
        phase: 'rendering',
        current: renderIndex,
        total: documentCount,
        label: `تجهيز ${getAttachmentName(attachment)} — الصك ${item.deed.deedNumber || ''}`,
      });

      try {
        const blob = await fetchAttachmentBlob(attachment, signal);
        const isPdf = (
          isProbablyPdfAttachment(attachment)
          || blob.type.toLowerCase().includes('pdf')
          || await hasPdfSignature(blob)
        );

        if (includeHeaders && !separatorAdded) {
          await addFullPageJpeg(
            pdf,
            createDeedSeparator(item.deed, item.attachments.length)
          );
          separatorAdded = true;
        }

        let pagesAdded = 0;

        if (isPdf) {
          pagesAdded = await addPdfDocument(pdf, blob);
          successfulPdfDocuments += 1;
        } else {
          pagesAdded = await addImageDocument(pdf, blob, signal);
          successfulImageDocuments += 1;
        }

        successfulDocuments += 1;
        copiedDocumentPages += pagesAdded;
        successfulDeeds.add(item.deed.id);
      } catch (error) {
        if (signal?.aborted) throw error;
        console.error(
          'Failed to merge deed document:',
          item.deed.deedNumber,
          getAttachmentName(attachment),
          error
        );
        skippedDocuments += 1;
      }
    }
  }

  if (!successfulDocuments) {
    throw new Error(
      'تم العثور على مستندات للصكوك، لكن تعذر تحميلها أو دمجها. تحقق من صلاحيات ملفات Google Drive ثم حاول مرة أخرى.'
    );
  }

  const rawName = options.fileName
    || `ملف مستندات الصكوك - ${new Date().toISOString().slice(0, 10)}`;
  const fileName = `${sanitizeFileName(rawName).replace(/\.pdf$/i, '')}.pdf`;

  const outputBytes = await pdf.save({
    useObjectStreams: true,
    addDefaultPage: false,
  });

  savePdfBytes(outputBytes, fileName);

  return {
    fileName,
    deedCount: successfulDeeds.size,
    documentCount: successfulDocuments,
    pageCount: copiedDocumentPages,
    pdfCount: successfulPdfDocuments,
    imageCount: successfulImageDocuments,
    skippedDeeds,
    skippedDocuments,
    skippedImages: skippedDocuments,
  };
};
