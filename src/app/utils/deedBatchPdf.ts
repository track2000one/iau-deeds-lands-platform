import { jsPDF } from 'jspdf';
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
  imageCount: number;
  skippedDeeds: number;
  skippedImages: number;
};

const getAttachmentUrl = (attachment: BatchAttachment) =>
  attachment.driveUrl || attachment.fileUrl || '';

const getAttachmentMime = (attachment: BatchAttachment) =>
  String(attachment.mimeType || attachment.fileType || '').toLowerCase();

const getAttachmentName = (attachment: BatchAttachment) =>
  String(attachment.title || attachment.originalName || attachment.fileName || 'صورة صك');

const getDriveFileId = (attachment: BatchAttachment) => {
  if (attachment.driveFileId) return String(attachment.driveFileId);

  const url = getAttachmentUrl(attachment);
  if (!url) return '';

  try {
    const parsed = new URL(url);
    const queryId = parsed.searchParams.get('id');
    if (queryId) return queryId;
  } catch {
    // Fall through to path matching.
  }

  const match = String(url).match(/\/(?:file\/d|d)\/([^/?#]+)/);
  return match?.[1] || '';
};

const isDeedImageAttachment = (attachment: BatchAttachment) => {
  const type = String(attachment.attachmentType || '').toLowerCase();
  if (!['deed_image', 'deed'].includes(type)) return false;

  const mime = getAttachmentMime(attachment);
  if (mime === 'application/pdf' || mime.includes('pdf')) return false;
  if (mime.startsWith('image/')) return true;

  const name = getAttachmentName(attachment);
  const url = getAttachmentUrl(attachment);
  if (/\.(png|jpe?g|webp|gif|bmp)(?:$|[?#])/i.test(name) || /\.(png|jpe?g|webp|gif|bmp)(?:$|[?#])/i.test(url)) {
    return true;
  }

  // Legacy deed-image links often have no MIME type or extension, especially Google Drive links.
  return Boolean(getDriveFileId(attachment) || url);
};

const dedupeAttachments = (attachments: BatchAttachment[]) => {
  const seen = new Set<string>();
  return attachments.filter((attachment) => {
    const key = String(attachment.id || getAttachmentUrl(attachment) || `${attachment.attachmentType || ''}:${getAttachmentName(attachment)}`);
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

const getDeedAttachments = async (deed: Deed, signal?: AbortSignal): Promise<BatchAttachment[]> => {
  if (signal?.aborted) throw new DOMException('تم إلغاء إنشاء ملف PDF', 'AbortError');

  const inline = Array.isArray(deed.attachments)
    ? (deed.attachments as unknown as BatchAttachment[])
    : [];

  if (!isApiEnabled) return dedupeAttachments(inline);

  // Batch export must bypass browser/HTTP conditional caching. A 304 response has
  // no JSON body and would otherwise be interpreted as a failed attachment read,
  // causing every deed to look as if it has no printable images.
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
    throw new Error((body as any)?.message || `تعذر قراءة صور الصك ${deed.deedNumber || ''}`);
  }
  const remote = Array.isArray(body) ? (body as BatchAttachment[]) : [];
  return dedupeAttachments([...remote, ...inline]);
};

const fetchDirectBlob = async (url: string, signal?: AbortSignal) => {
  const response = await fetch(url, { signal, mode: 'cors' });
  if (!response.ok) throw new Error(`تعذر تحميل الصورة (HTTP ${response.status})`);
  return response.blob();
};

const googleDriveThumbnailUrl = (attachment: BatchAttachment) => {
  const fileId = getDriveFileId(attachment);
  return fileId ? `https://drive.google.com/thumbnail?id=${encodeURIComponent(fileId)}&sz=w4000` : '';
};

const fetchAttachmentBlob = async (attachment: BatchAttachment, signal?: AbortSignal) => {
  if (signal?.aborted) throw new DOMException('تم إلغاء إنشاء ملف PDF', 'AbortError');

  if (isApiEnabled && attachment.id) {
    try {
      const response = await authenticatedFetch(`/api/attachments/file/${encodeURIComponent(attachment.id)}/content`, { signal });
      if (response.ok) {
        const blob = await response.blob();
        if (blob.size > 0) return blob;
      }
    } catch (error) {
      if (signal?.aborted) throw error;
      // Continue with browser-accessible fallbacks.
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

  const thumbnail = googleDriveThumbnailUrl(attachment);
  if (thumbnail) return fetchDirectBlob(thumbnail, signal);

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

const blobToOptimizedJpeg = async (blob: Blob, signal?: AbortSignal) => {
  const image = await loadImageFromBlob(blob, signal);
  const sourceWidth = image.naturalWidth || image.width;
  const sourceHeight = image.naturalHeight || image.height;
  if (!sourceWidth || !sourceHeight) throw new Error('أبعاد الصورة غير صالحة');

  const maxDimension = 3000;
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
    dataUrl: canvas.toDataURL('image/jpeg', 0.94),
    width,
    height,
  };
};

const createArabicHeader = (deed: Deed, imageNumber: number, deedImageCount: number) => {
  const canvas = document.createElement('canvas');
  canvas.width = 1800;
  canvas.height = 230;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('تعذر تجهيز ترويسة الصك');

  context.fillStyle = '#ffffff';
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.fillStyle = '#123d73';
  context.fillRect(0, 0, 16, canvas.height);
  context.direction = 'rtl';
  context.textAlign = 'right';

  context.fillStyle = '#142f49';
  context.font = '700 54px Tahoma, Arial, sans-serif';
  context.fillText(`صك رقم: ${deed.deedNumber || '-'}`, 1720, 78);

  context.fillStyle = '#60758a';
  context.font = '600 31px Tahoma, Arial, sans-serif';
  const location = [deed.city, deed.district].filter(Boolean).join(' — ') || 'الموقع غير محدد';
  context.fillText(location, 1720, 132);

  context.textAlign = 'left';
  context.direction = 'rtl';
  context.fillStyle = '#526d84';
  context.font = '600 28px Tahoma, Arial, sans-serif';
  context.fillText(`الصورة ${imageNumber.toLocaleString('ar-SA')} من ${deedImageCount.toLocaleString('ar-SA')}`, 80, 82);

  context.strokeStyle = '#c9d7e4';
  context.lineWidth = 3;
  context.beginPath();
  context.moveTo(70, 188);
  context.lineTo(1730, 188);
  context.stroke();

  return canvas.toDataURL('image/png');
};

const createCover = (deedCount: number, imageCount: number, scopeLabel: string) => {
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
  context.font = '800 92px Tahoma, Arial, sans-serif';
  context.fillText('ملف صور الصكوك', 1260, 525);

  context.fillStyle = '#6a7d8f';
  context.font = '600 34px Tahoma, Arial, sans-serif';
  context.fillText(scopeLabel || 'جميع الصكوك', 1260, 590);

  const cards = [
    ['عدد الصكوك', deedCount.toLocaleString('ar-SA')],
    ['عدد صور الصكوك', imageCount.toLocaleString('ar-SA')],
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
  context.fillText('تم إنشاء الملف آليًا من منصة إدارة الصكوك والأراضي', 700, 1835);

  return canvas.toDataURL('image/jpeg', 0.95);
};

const sanitizeFileName = (value: string) => {
  const clean = value.trim().replace(/[\\/:*?"<>|]+/g, '-').replace(/\s+/g, ' ');
  return clean || 'ملف صور الصكوك';
};

export const generateDeedImagesPdf = async (
  deeds: Deed[],
  options: DeedBatchPdfOptions = {}
): Promise<DeedBatchPdfResult> => {
  const includeCover = options.includeCover !== false;
  const includeHeaders = options.includeHeaders !== false;
  const signal = options.signal;

  if (!deeds.length) throw new Error('لا توجد صكوك ضمن النطاق المحدد');

  const collectedByDeed = new Map<number, BatchAttachment[]>();
  let skippedDeeds = 0;
  let nextDeedIndex = 0;
  let completedDeeds = 0;
  const workerCount = Math.min(6, deeds.length);

  const collectWorker = async () => {
    while (true) {
      if (signal?.aborted) throw new DOMException('تم إلغاء إنشاء ملف PDF', 'AbortError');
      const index = nextDeedIndex;
      nextDeedIndex += 1;
      if (index >= deeds.length) return;

      const deed = deeds[index];
      try {
        const attachments = (await getDeedAttachments(deed, signal)).filter(isDeedImageAttachment);
        if (attachments.length) collectedByDeed.set(index, attachments);
        else skippedDeeds += 1;
      } catch (error) {
        if (signal?.aborted) throw error;
        skippedDeeds += 1;
      } finally {
        completedDeeds += 1;
        options.onProgress?.({
          phase: 'collecting',
          current: completedDeeds,
          total: deeds.length,
          label: `قراءة مرفقات الصك ${deed.deedNumber || ''}`,
        });
      }
    }
  };

  await Promise.all(Array.from({ length: workerCount }, () => collectWorker()));

  const collected: Array<{ deed: Deed; attachment: BatchAttachment; deedImageIndex: number; deedImageCount: number }> = [];
  deeds.forEach((deed, deedIndex) => {
    const attachments = collectedByDeed.get(deedIndex) || [];
    attachments.forEach((attachment, imageIndex) => {
      collected.push({
        deed,
        attachment,
        deedImageIndex: imageIndex + 1,
        deedImageCount: attachments.length,
      });
    });
  });

  if (!collected.length) {
    throw new Error('لا توجد صور صكوك قابلة للتجميع ضمن النطاق المحدد');
  }

  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
    compress: true,
    putOnlyUsedFonts: true,
  });

  pdf.setProperties({
    title: 'IAU Deeds Images',
    subject: 'Combined deed images',
    author: 'Imam Abdulrahman Bin Faisal University',
    creator: 'IAU Deeds Platform',
  });

  if (includeCover) {
    const cover = createCover(
      new Set(collected.map((item) => item.deed.id)).size,
      collected.length,
      options.scopeLabel || 'جميع الصكوك'
    );
    pdf.addImage(cover, 'JPEG', 0, 0, 210, 297, undefined, 'FAST');
  }

  let successfulImages = 0;
  let skippedImages = 0;
  const successfulDeeds = new Set<string>();

  for (let index = 0; index < collected.length; index += 1) {
    if (signal?.aborted) throw new DOMException('تم إلغاء إنشاء ملف PDF', 'AbortError');
    const item = collected[index];

    options.onProgress?.({
      phase: 'rendering',
      current: index + 1,
      total: collected.length,
      label: `تجهيز صورة الصك ${item.deed.deedNumber || ''}`,
    });

    try {
      const blob = await fetchAttachmentBlob(item.attachment, signal);
      const image = await blobToOptimizedJpeg(blob, signal);

      if (includeCover || successfulImages > 0) pdf.addPage('a4', 'portrait');

      const margin = 8;
      let imageTop = margin;
      if (includeHeaders) {
        const header = createArabicHeader(item.deed, item.deedImageIndex, item.deedImageCount);
        pdf.addImage(header, 'PNG', margin, margin, 210 - margin * 2, 21, undefined, 'FAST');
        imageTop = 33;
      }

      const footerReserve = 9;
      const maxWidth = 210 - margin * 2;
      const maxHeight = 297 - imageTop - footerReserve;
      const scale = Math.min(maxWidth / image.width, maxHeight / image.height);
      const drawWidth = image.width * scale;
      const drawHeight = image.height * scale;
      const x = (210 - drawWidth) / 2;
      const y = imageTop + Math.max(0, (maxHeight - drawHeight) / 2);

      pdf.addImage(image.dataUrl, 'JPEG', x, y, drawWidth, drawHeight, undefined, 'FAST');

      pdf.setTextColor(125, 139, 151);
      pdf.setFontSize(7);
      pdf.text(String(successfulImages + 1), 105, 293, { align: 'center' });

      successfulImages += 1;
      successfulDeeds.add(item.deed.id);
    } catch (error) {
      if (signal?.aborted) throw error;
      skippedImages += 1;
    }
  }

  if (!successfulImages) {
    throw new Error('تعذر تحميل صور الصكوك. تحقق من صلاحيات روابط المرفقات ثم حاول مرة أخرى.');
  }

  const rawName = options.fileName || `ملف صور الصكوك - ${new Date().toISOString().slice(0, 10)}`;
  const fileName = `${sanitizeFileName(rawName).replace(/\.pdf$/i, '')}.pdf`;
  pdf.save(fileName);

  return {
    fileName,
    deedCount: successfulDeeds.size,
    imageCount: successfulImages,
    skippedDeeds,
    skippedImages,
  };
};
