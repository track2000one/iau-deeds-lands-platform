import html2canvas from 'html2canvas';
import { PDFDocument } from 'pdf-lib';
import { authenticatedFetch } from '../../lib/http';
import type { TransactionFollowUpAttachment } from '../api/transactionFollowUp';

const A4_WIDTH = 595.28;
const A4_HEIGHT = 841.89;
const PAGE_MARGIN = 20;

const renderHtmlToPdf = async (html: string) => {
  const host = document.createElement('div');
  host.setAttribute('dir', 'rtl');
  host.style.position = 'fixed';
  host.style.left = '-12000px';
  host.style.top = '0';
  host.style.width = '1120px';
  host.style.background = '#ffffff';
  host.style.zIndex = '-1';
  host.innerHTML = html;
  document.body.appendChild(host);

  try {
    await new Promise((resolve) => window.setTimeout(resolve, 60));

    const canvas = await html2canvas(host, {
      scale: 1.35,
      backgroundColor: '#ffffff',
      useCORS: true,
      logging: false,
      windowWidth: 1120,
    });

    const pdf = await PDFDocument.create();
    const printableWidth = A4_WIDTH - PAGE_MARGIN * 2;
    const printableHeight = A4_HEIGHT - PAGE_MARGIN * 2;
    const pixelsPerPoint = canvas.width / printableWidth;
    const pageHeightPixels = Math.max(1, Math.floor(printableHeight * pixelsPerPoint));

    let y = 0;
    while (y < canvas.height) {
      const sliceHeight = Math.min(pageHeightPixels, canvas.height - y);
      const slice = document.createElement('canvas');
      slice.width = canvas.width;
      slice.height = sliceHeight;
      const context = slice.getContext('2d');
      if (!context) throw new Error('تعذر تجهيز صفحات التقرير');

      context.fillStyle = '#ffffff';
      context.fillRect(0, 0, slice.width, slice.height);
      context.drawImage(
        canvas,
        0,
        y,
        canvas.width,
        sliceHeight,
        0,
        0,
        canvas.width,
        sliceHeight,
      );

      const image = await pdf.embedPng(slice.toDataURL('image/png'));
      const renderedHeight = sliceHeight / pixelsPerPoint;
      const page = pdf.addPage([A4_WIDTH, A4_HEIGHT]);
      page.drawImage(image, {
        x: PAGE_MARGIN,
        y: A4_HEIGHT - PAGE_MARGIN - renderedHeight,
        width: printableWidth,
        height: renderedHeight,
      });

      y += sliceHeight;
    }

    return pdf;
  } finally {
    host.remove();
  }
};

const fetchAttachment = async (
  transactionId: string,
  attachment: TransactionFollowUpAttachment,
) => {
  const response = await authenticatedFetch(
    `/api/archive/transactions/${transactionId}/attachments/${attachment.id}/content`,
    {
      method: 'GET',
      headers: {
        Accept: attachment.mimeType || 'application/octet-stream',
      },
    },
  );

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}));
    throw new Error(errorBody?.message || `تعذر تحميل المرفق ${attachment.title || ''}`);
  }

  return {
    bytes: await response.arrayBuffer(),
    mimeType: response.headers.get('content-type') || attachment.mimeType || '',
  };
};

const convertImageToPng = async (bytes: ArrayBuffer, mimeType: string) => {
  const blob = new Blob([bytes], { type: mimeType || 'image/*' });
  const objectUrl = URL.createObjectURL(blob);

  try {
    const image = new Image();
    image.src = objectUrl;
    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve();
      image.onerror = () => reject(new Error('تعذر قراءة الصورة'));
    });

    const maxSide = 2200;
    const scale = Math.min(1, maxSide / Math.max(image.naturalWidth, image.naturalHeight));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
    canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));

    const context = canvas.getContext('2d');
    if (!context) throw new Error('تعذر تجهيز الصورة');

    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(image, 0, 0, canvas.width, canvas.height);

    const dataUrl = canvas.toDataURL('image/png');
    const base64 = dataUrl.split(',')[1] || '';
    const binary = window.atob(base64);
    const output = new Uint8Array(binary.length);
    for (let index = 0; index < binary.length; index += 1) {
      output[index] = binary.charCodeAt(index);
    }
    return output;
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
};

const appendImageAttachment = async (
  target: PDFDocument,
  bytes: ArrayBuffer,
  mimeType: string,
) => {
  let embedded;

  if (mimeType.includes('png')) {
    embedded = await target.embedPng(bytes);
  } else if (mimeType.includes('jpeg') || mimeType.includes('jpg')) {
    embedded = await target.embedJpg(bytes);
  } else {
    const png = await convertImageToPng(bytes, mimeType);
    embedded = await target.embedPng(png);
  }

  const page = target.addPage([A4_WIDTH, A4_HEIGHT]);
  const maxWidth = A4_WIDTH - PAGE_MARGIN * 2;
  const maxHeight = A4_HEIGHT - PAGE_MARGIN * 2;
  const scale = Math.min(maxWidth / embedded.width, maxHeight / embedded.height, 1);
  const width = embedded.width * scale;
  const height = embedded.height * scale;

  page.drawImage(embedded, {
    x: (A4_WIDTH - width) / 2,
    y: (A4_HEIGHT - height) / 2,
    width,
    height,
  });
};

const appendPdfAttachment = async (target: PDFDocument, bytes: ArrayBuffer) => {
  const source = await PDFDocument.load(bytes, {
    ignoreEncryption: true,
    updateMetadata: false,
  });
  const pageIndices = source.getPageIndices();
  const pages = await target.copyPages(source, pageIndices);
  pages.forEach((page) => target.addPage(page));
};

export const openArchivedTransactionVisualPdf = async (input: {
  transactionId: string;
  html: string;
  attachments: TransactionFollowUpAttachment[];
  popup: Window;
}) => {
  const report = await renderHtmlToPdf(input.html);
  let appended = 0;
  const failed: string[] = [];

  for (const attachment of input.attachments) {
    try {
      const file = await fetchAttachment(input.transactionId, attachment);
      const mimeType = String(file.mimeType || attachment.mimeType || '').toLowerCase();

      if (mimeType.includes('pdf')) {
        await appendPdfAttachment(report, file.bytes);
        appended += 1;
        continue;
      }

      if (mimeType.startsWith('image/')) {
        await appendImageAttachment(report, file.bytes, mimeType);
        appended += 1;
        continue;
      }

      failed.push(attachment.title || 'مرفق');
    } catch {
      failed.push(attachment.title || 'مرفق');
    }
  }

  const bytes = await report.save();
  const arrayBuffer = bytes.buffer.slice(
    bytes.byteOffset,
    bytes.byteOffset + bytes.byteLength,
  ) as ArrayBuffer;
  const blob = new Blob([arrayBuffer], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);

  input.popup.location.replace(url);
  window.setTimeout(() => URL.revokeObjectURL(url), 120_000);

  return {
    appended,
    failed,
  };
};
