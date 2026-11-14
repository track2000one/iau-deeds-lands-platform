import React from 'react';
import {
  ExternalLink,
  FileArchive,
  FileSpreadsheet,
  FileText,
  Image as ImageIcon,
  Presentation,
} from 'lucide-react';

export type PreviewAttachment = {
  id?: string | null;
  title?: string | null;
  driveUrl?: string | null;
  fileUrl?: string | null;
  driveFileId?: string | null;
  mimeType?: string | null;
  fileType?: string | null;
  fileName?: string | null;
  originalName?: string | null;
  attachmentType?: string | null;
};

const getName = (attachment: PreviewAttachment) =>
  attachment.title ||
  attachment.originalName ||
  attachment.fileName ||
  'مرفق';

const getMimeType = (attachment: PreviewAttachment) =>
  attachment.mimeType || attachment.fileType || '';

const getOriginalUrl = (attachment: PreviewAttachment) =>
  String(attachment.driveUrl || attachment.fileUrl || '');

const extractGoogleDriveFileId = (
  attachment: PreviewAttachment
): string | null => {
  if (attachment.driveFileId) return attachment.driveFileId;

  const url = getOriginalUrl(attachment);
  const patterns = [
    /\/file\/d\/([^/]+)/,
    /[?&]id=([^&]+)/,
    /\/d\/([^/]+)/,
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match?.[1]) return decodeURIComponent(match[1]);
  }

  return null;
};

export const isPdfAttachment = (
  attachment: PreviewAttachment
): boolean => {
  const name = getName(attachment).toLowerCase();
  const mime = getMimeType(attachment).toLowerCase();
  const url = getOriginalUrl(attachment).toLowerCase();

  return (
    mime === 'application/pdf' ||
    mime.includes('pdf') ||
    name.endsWith('.pdf') ||
    /\.pdf(?:$|[?#])/i.test(url)
  );
};

export const isImageAttachmentPreview = (
  attachment: PreviewAttachment
): boolean => {
  const name = getName(attachment).toLowerCase();
  const mime = getMimeType(attachment).toLowerCase();
  const url = getOriginalUrl(attachment).toLowerCase();

  return (
    mime.startsWith('image/') ||
    /\.(png|jpe?g|webp|gif|bmp|svg|heic|heif)$/i.test(name) ||
    /\.(png|jpe?g|webp|gif|bmp|svg|heic|heif)(?:$|[?#])/i.test(url)
  );
};

export const getAttachmentPreviewUrl = (
  attachment: PreviewAttachment
): string => {
  const originalUrl = getOriginalUrl(attachment);
  const fileId = extractGoogleDriveFileId(attachment);

  if (fileId) {
    if (isPdfAttachment(attachment)) {
      return `https://drive.google.com/file/d/${fileId}/preview`;
    }

    if (isImageAttachmentPreview(attachment)) {
      return `https://drive.google.com/thumbnail?id=${fileId}&sz=w1600`;
    }

    return `https://drive.google.com/file/d/${fileId}/preview`;
  }

  return originalUrl;
};

const getFileIcon = (attachment: PreviewAttachment) => {
  const name = getName(attachment).toLowerCase();
  const mime = getMimeType(attachment).toLowerCase();

  if (mime.includes('spreadsheet') || /\.(xlsx?|csv)$/i.test(name)) {
    return FileSpreadsheet;
  }

  if (mime.includes('presentation') || /\.(pptx?)$/i.test(name)) {
    return Presentation;
  }

  if (mime.includes('zip') || /\.(zip|rar|7z)$/i.test(name)) {
    return FileArchive;
  }

  if (isImageAttachmentPreview(attachment)) return ImageIcon;

  return FileText;
};

export const AttachmentPreviewCard: React.FC<{
  attachment: PreviewAttachment;
  compact?: boolean;
  onOpen?: () => void;
  actions?: React.ReactNode;
}> = ({ attachment, compact = false, onOpen, actions }) => {
  const name = getName(attachment);
  const previewUrl = getAttachmentPreviewUrl(attachment);
  const originalUrl = getOriginalUrl(attachment);
  const FileIcon = getFileIcon(attachment);
  const isPdf = isPdfAttachment(attachment);
  const isImage = isImageAttachmentPreview(attachment);
  const previewHeight = compact ? 'h-44' : 'h-64';
  const [pdfPreviewActive, setPdfPreviewActive] = React.useState(false);

  const open = () => {
    if (onOpen) {
      onOpen();
      return;
    }

    if (originalUrl) {
      window.open(originalUrl, '_blank', 'noopener,noreferrer');
    }
  };

  return (
    <div className="overflow-hidden rounded-xl border bg-card shadow-sm transition hover:border-primary/70 hover:shadow-md">
      <div className={`relative w-full ${previewHeight} overflow-hidden bg-muted/20`}>
        {isPdf && previewUrl ? (
          pdfPreviewActive ? (
            <div className="relative h-full w-full">
              <iframe
                src={previewUrl}
                title={name}
                loading="lazy"
                className="h-full w-full border-0 bg-white"
              />
              <button
                type="button"
                onClick={() => setPdfPreviewActive(false)}
                className="absolute end-2 top-2 rounded-lg border border-slate-300 bg-white/95 px-2.5 py-1 text-xs font-bold text-slate-800 shadow hover:bg-white"
                aria-label={`إغلاق معاينة PDF: ${name}`}
              >
                إغلاق المعاينة
              </button>
            </div>
          ) : (
            <button
              type="button"
              className="flex h-full w-full flex-col items-center justify-center gap-3 px-4 text-center hover:bg-primary/5 focus-visible:outline-2 focus-visible:outline-offset-[-3px] focus-visible:outline-primary"
              onClick={() => setPdfPreviewActive(true)}
              title={`تحميل معاينة PDF: ${name}`}
              aria-label={`معاينة ملف PDF داخل البطاقة: ${name}`}
            >
              <FileText className="h-12 w-12 text-red-600" aria-hidden="true" />
              <span className="text-sm font-bold">عرض معاينة PDF</span>
              <span className="text-xs text-muted-foreground">اضغط لتحميل المعاينة داخل البطاقة</span>
            </button>
          )
        ) : isImage && previewUrl ? (
          <button
            type="button"
            onClick={open}
            className="block h-full w-full cursor-zoom-in bg-muted/20"
            title={`فتح ${name}`}
          >
            <img
              src={previewUrl}
              alt={name}
              className="h-full w-full bg-muted object-contain"
              loading="lazy"
              decoding="async"
              onError={(event) => {
                if (event.currentTarget.src !== originalUrl && originalUrl) {
                  event.currentTarget.src = originalUrl;
                }
              }}
            />
          </button>
        ) : (
          <button
            type="button"
            onClick={open}
            className="flex h-full w-full flex-col items-center justify-center gap-3"
            title={`فتح ${name}`}
          >
            <FileIcon className="h-14 w-14 text-muted-foreground" />
            <span className="px-3 text-center text-xs text-muted-foreground">
              معاينة الملف
            </span>
          </button>
        )}

        {(isPdf || isImage) && (
          <button
            type="button"
            onClick={open}
            className="absolute bottom-2 end-2 inline-flex items-center gap-1 rounded-lg border bg-background/90 px-2.5 py-1.5 text-xs font-medium shadow-sm backdrop-blur hover:bg-background"
            title="فتح المرفق بالحجم الكامل"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            فتح
          </button>
        )}
      </div>

      <div className="space-y-2 p-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold" title={name}>
              {name}
            </p>
            <p className="mt-1 truncate text-xs text-muted-foreground">
              {isPdf
                ? 'PDF'
                : isImage
                  ? 'صورة'
                  : getMimeType(attachment) || attachment.attachmentType || 'ملف'}
            </p>
          </div>

          <button
            type="button"
            onClick={open}
            className="shrink-0 rounded-md border p-2 hover:bg-muted"
            title="فتح الملف"
          >
            <ExternalLink className="h-4 w-4" />
          </button>
        </div>

        {actions}
      </div>
    </div>
  );
};

export const AttachmentPreviewGrid: React.FC<{
  attachments: PreviewAttachment[];
  emptyText?: string;
  compact?: boolean;
}> = ({ attachments, emptyText = 'لا توجد مرفقات.', compact = false }) => {
  const [visibleCount, setVisibleCount] = React.useState(12);
  if (!attachments.length) {
    return (
      <p className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">
        {emptyText}
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {attachments.slice(0, visibleCount).map((attachment, index) => (
        <AttachmentPreviewCard
          key={
            attachment.id ||
            attachment.driveUrl ||
            attachment.fileUrl ||
            `${getName(attachment)}-${index}`
          }
          attachment={attachment}
          compact={compact}
        />
      ))}
      </div>
      {visibleCount < attachments.length && (
        <div className="flex flex-col items-center gap-2 text-center">
          <p className="text-xs text-muted-foreground" aria-live="polite">
            معاينة {Math.min(visibleCount, attachments.length).toLocaleString('ar-SA')} من {attachments.length.toLocaleString('ar-SA')} مرفق
          </p>
          <button
            type="button"
            onClick={() => React.startTransition(() => setVisibleCount((count) => count + 12))}
            className="min-h-10 rounded-lg border border-primary/40 bg-background px-5 py-2 text-sm font-bold text-foreground hover:border-primary hover:bg-primary/5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          >
            عرض المزيد من المرفقات
          </button>
        </div>
      )}
    </div>
  );
};
