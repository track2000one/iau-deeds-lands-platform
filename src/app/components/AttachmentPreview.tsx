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

const extractGoogleDriveFileId = (
  attachment: PreviewAttachment
): string | null => {
  if (attachment.driveFileId) return attachment.driveFileId;

  const url = String(attachment.driveUrl || '');
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

  return mime === 'application/pdf' || name.endsWith('.pdf');
};

export const isImageAttachmentPreview = (
  attachment: PreviewAttachment
): boolean => {
  const name = getName(attachment).toLowerCase();
  const mime = getMimeType(attachment).toLowerCase();

  return (
    mime.startsWith('image/') ||
    /\.(png|jpe?g|webp|gif|bmp|svg|heic|heif)$/i.test(name)
  );
};

export const getAttachmentPreviewUrl = (
  attachment: PreviewAttachment
): string => {
  const originalUrl = String(attachment.driveUrl || '');
  const fileId = extractGoogleDriveFileId(attachment);

  if (!fileId) return originalUrl;

  if (isPdfAttachment(attachment)) {
    return `https://drive.google.com/file/d/${fileId}/preview`;
  }

  if (isImageAttachmentPreview(attachment)) {
    return `https://drive.google.com/thumbnail?id=${fileId}&sz=w1600`;
  }

  return `https://drive.google.com/file/d/${fileId}/preview`;
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
}> = ({
  attachment,
  compact = false,
  onOpen,
  actions,
}) => {
  const name = getName(attachment);
  const previewUrl = getAttachmentPreviewUrl(attachment);
  const originalUrl = String(attachment.driveUrl || '');
  const FileIcon = getFileIcon(attachment);

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
    <div className="overflow-hidden rounded-xl border bg-card transition hover:border-primary/70">
      <button
        type="button"
        onClick={open}
        className="block w-full bg-muted/25 text-right"
        title={`فتح ${name}`}
      >
        {isPdfAttachment(attachment) ? (
          <iframe
            src={previewUrl}
            title={name}
            className={`${compact ? 'h-40' : 'h-56'} w-full bg-white pointer-events-none`}
          />
        ) : isImageAttachmentPreview(attachment) ? (
          <img
            src={previewUrl}
            alt={name}
            className={`${compact ? 'h-40' : 'h-56'} w-full bg-muted object-contain`}
            loading="lazy"
            onError={(event) => {
              if (event.currentTarget.src !== originalUrl && originalUrl) {
                event.currentTarget.src = originalUrl;
              }
            }}
          />
        ) : (
          <div className={`${compact ? 'h-40' : 'h-56'} flex flex-col items-center justify-center gap-3`}>
            <FileIcon className="h-12 w-12 text-muted-foreground" />
            <span className="px-3 text-center text-xs text-muted-foreground">
              معاينة الملف
            </span>
          </div>
        )}
      </button>

      <div className="space-y-2 p-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold" title={name}>
              {name}
            </p>
            <p className="mt-1 truncate text-xs text-muted-foreground">
              {getMimeType(attachment) ||
                attachment.attachmentType ||
                'Google Drive'}
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
}> = ({
  attachments,
  emptyText = 'لا توجد مرفقات.',
  compact = false,
}) => {
  if (!attachments.length) {
    return (
      <p className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">
        {emptyText}
      </p>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {attachments.map((attachment, index) => (
        <AttachmentPreviewCard
          key={
            attachment.id ||
            attachment.driveUrl ||
            `${getName(attachment)}-${index}`
          }
          attachment={attachment}
          compact={compact}
        />
      ))}
    </div>
  );
};
