import React, { useMemo, useRef, useState } from 'react';
import {
  Camera,
  ExternalLink,
  File,
  FileArchive,
  FileSpreadsheet,
  FileText,
  Image as ImageIcon,
  Link as LinkIcon,
  Loader2,
  Plus,
  Presentation,
  Upload,
  X,
} from 'lucide-react';
import { authenticatedFetch } from '../../lib/http';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { toast } from 'sonner';

interface DriveLinkItem {
  title: string;
  url: string;
  driveFileId?: string;
  mimeType?: string;
}

interface UploadedFileResponse {
  fileName?: string;
  driveUrl?: string;
  driveFileId?: string;
  mimeType?: string;
  message?: string;
}

interface FileUploadZoneProps {
  onFilesChange?: (files: File[]) => void;
  onLinksChange?: (links: DriveLinkItem[]) => void;
  existingFiles?: {
    url: string;
    name: string;
    driveFileId?: string;
    mimeType?: string;
  }[];
  onDeleteExisting?: (url: string) => void;
  maxFiles?: number;
  maxSizeMB?: number;
  accept?: string;
  label?: string;
  description?: string;
  disabled?: boolean;

  /**
   * اسم وحدة الصلاحية المستخدمة في رفع الملفات.
   * عند عدم تمريره يتم استنتاجه من مسار الصفحة.
   */
  uploadModule?: string;
}

const isValidDriveOrHttpUrl = (value: string) => {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' || url.protocol === 'http:';
  } catch {
    return false;
  }
};

const normalizeAccept = (accept: string) =>
  accept
    .split(',')
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean)
    .map((item) => {
      if (
        !item.startsWith('.') &&
        !item.includes('/') &&
        item !== '*'
      ) {
        return `.${item}`;
      }

      return item;
    });

const getFileExtension = (fileName: string) => {
  const index = fileName.lastIndexOf('.');
  return index >= 0 ? fileName.slice(index).toLowerCase() : '';
};

const isAcceptedFile = (file: File, accept: string) => {
  if (!accept.trim()) return true;

  const rules = normalizeAccept(accept);
  const fileType = file.type.toLowerCase();
  const extension = getFileExtension(file.name);

  return rules.some((rule) => {
    if (rule === '*' || rule === '*/*') return true;
    if (rule.startsWith('.')) return extension === rule;

    if (rule.endsWith('/*')) {
      return fileType.startsWith(rule.slice(0, -1));
    }

    return fileType === rule;
  });
};

const inferUploadModule = () => {
  const path = window.location.pathname.toLowerCase();
  const hash = window.location.hash.toLowerCase();
  const route = `${path}${hash}`;

  if (route.includes('site-inspection')) return 'site_inspections';
  if (route.includes('allocated')) return 'allocated_lands';
  if (route.includes('delivered')) return 'delivered_lands';
  if (
    route.includes('lands/leased-out') ||
    route.includes('leased-lands-out')
  ) {
    return 'leased_lands_out';
  }
  if (
    route.includes('lands/leased-in') ||
    route.includes('leased-lands-in')
  ) {
    return 'leased_lands_in';
  }
  if (
    route.includes('buildings/leased-out') ||
    route.includes('leased-buildings-out')
  ) {
    return 'leased_buildings_out';
  }
  if (
    route.includes('buildings/leased-in') ||
    route.includes('leased-buildings-in')
  ) {
    return 'leased_buildings_in';
  }
  if (route.includes('archive')) return 'archive';
  if (route.includes('deed')) return 'deeds';

  return 'deeds';
};

const extractGoogleDriveFileId = (url: string) => {
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

const getPreviewUrl = (item: DriveLinkItem) => {
  const fileId =
    item.driveFileId || extractGoogleDriveFileId(item.url);

  if (!fileId) return item.url;

  if (
    item.mimeType === 'application/pdf' ||
    item.title.toLowerCase().endsWith('.pdf')
  ) {
    return `https://drive.google.com/file/d/${fileId}/preview`;
  }

  if (
    item.mimeType?.startsWith('image/') ||
    /\.(png|jpe?g|webp|gif|bmp|svg|heic|heif)$/i.test(item.title)
  ) {
    return `https://drive.google.com/thumbnail?id=${fileId}&sz=w1200`;
  }

  return item.url;
};

const getFileIcon = (item: DriveLinkItem) => {
  const title = item.title.toLowerCase();
  const mime = item.mimeType?.toLowerCase() || '';

  if (
    mime.startsWith('image/') ||
    /\.(png|jpe?g|webp|gif|bmp|svg|heic|heif)$/i.test(title)
  ) {
    return ImageIcon;
  }

  if (mime === 'application/pdf' || title.endsWith('.pdf')) {
    return FileText;
  }

  if (
    mime.includes('spreadsheet') ||
    /\.(xlsx?|csv)$/i.test(title)
  ) {
    return FileSpreadsheet;
  }

  if (
    mime.includes('presentation') ||
    /\.(pptx?)$/i.test(title)
  ) {
    return Presentation;
  }

  if (/\.(zip|rar|7z)$/i.test(title)) return FileArchive;

  return File;
};

export const FileUploadZone: React.FC<FileUploadZoneProps> = ({
  onFilesChange,
  onLinksChange,
  existingFiles = [],
  onDeleteExisting,
  maxFiles = 10,
  maxSizeMB = 10,
  accept = 'image/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.mp4',
  label,
  description,
  disabled = false,
  uploadModule,
}) => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const cameraInputRef = useRef<HTMLInputElement | null>(null);

  const [links, setLinks] = useState<DriveLinkItem[]>([]);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [title, setTitle] = useState('');
  const [url, setUrl] = useState('');
  const [uploadingCount, setUploadingCount] = useState(0);

  const totalCount = links.length + existingFiles.length;
  const isUploading = uploadingCount > 0;

  const acceptedLabel = useMemo(() => {
    return normalizeAccept(accept)
      .map((item) => item.replace('image/*', 'الصور'))
      .map((item) => item.replace('application/pdf', 'PDF'))
      .join('، ');
  }, [accept]);

  const updateLinks = (next: DriveLinkItem[]) => {
    setLinks(next);
    onLinksChange?.(next);
  };

  const updateSelectedFiles = (next: File[]) => {
    setSelectedFiles(next);
    onFilesChange?.(next);
  };

  const addLink = () => {
    if (disabled || isUploading) return;

    if (totalCount >= maxFiles) {
      toast.error(`الحد الأعلى للمرفقات هو ${maxFiles}`);
      return;
    }

    if (!title.trim()) {
      toast.error('أدخل اسم المرفق');
      return;
    }

    if (!isValidDriveOrHttpUrl(url.trim())) {
      toast.error('أدخل رابط Google Drive أو رابط HTTP صحيح');
      return;
    }

    updateLinks([
      ...links,
      {
        title: title.trim(),
        url: url.trim(),
        driveFileId:
          extractGoogleDriveFileId(url.trim()) || undefined,
      },
    ]);

    setTitle('');
    setUrl('');
    toast.success('تمت إضافة الرابط');
  };

  const removeLink = (index: number) => {
    updateLinks(
      links.filter((_, itemIndex) => itemIndex !== index)
    );
  };

  const uploadOneFile = async (
    file: File
  ): Promise<DriveLinkItem> => {
    const formData = new FormData();
    formData.append('file', file);

    const response = await authenticatedFetch('/api/uploads', {
      method: 'POST',
      headers: {
        'X-Upload-Module': uploadModule || inferUploadModule(),
      },
      body: formData,
    });

    const body = (await response
      .json()
      .catch(() => ({}))) as UploadedFileResponse;

    if (!response.ok) {
      throw new Error(
        body.message || `تعذر رفع الملف: ${file.name}`
      );
    }

    if (!body.driveUrl) {
      throw new Error(
        `تم رفع الملف ${file.name} دون إرجاع رابط Google Drive`
      );
    }

    return {
      title: body.fileName || file.name,
      url: body.driveUrl,
      driveFileId: body.driveFileId,
      mimeType: body.mimeType || file.type,
    };
  };

  const handleFiles = async (files: File[]) => {
    if (disabled || !files.length) return;

    const remaining = maxFiles - totalCount;

    if (remaining <= 0) {
      toast.error(`الحد الأعلى للمرفقات هو ${maxFiles}`);
      return;
    }

    const filesToUpload = files.slice(0, remaining);

    if (files.length > remaining) {
      toast.warning(
        `تم اختيار ${files.length} ملفات، وسيتم رفع ${remaining} فقط حسب الحد الأعلى`
      );
    }

    for (const file of filesToUpload) {
      if (!isAcceptedFile(file, accept)) {
        toast.error(`نوع الملف غير مسموح: ${file.name}`);
        return;
      }

      if (file.size > maxSizeMB * 1024 * 1024) {
        toast.error(
          `حجم الملف ${file.name} يتجاوز ${maxSizeMB} ميجابايت`
        );
        return;
      }
    }

    updateSelectedFiles([
      ...selectedFiles,
      ...filesToUpload,
    ]);

    setUploadingCount(filesToUpload.length);

    try {
      const uploaded: DriveLinkItem[] = [];

      for (const file of filesToUpload) {
        const item = await uploadOneFile(file);
        uploaded.push(item);
        setUploadingCount((count) => Math.max(0, count - 1));
      }

      updateLinks([...links, ...uploaded]);
      toast.success(
        `تم رفع ${uploaded.length} ملف إلى Google Drive`
      );
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : 'تعذر رفع الملفات'
      );
    } finally {
      setUploadingCount(0);
      updateSelectedFiles([]);
    }
  };

  const onFileInputChange = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const files = Array.from(event.target.files || []);
    event.target.value = '';
    await handleFiles(files);
  };

  const allItems: DriveLinkItem[] = [
    ...existingFiles.map((file) => ({
      title: file.name,
      url: file.url,
      driveFileId: file.driveFileId,
      mimeType: file.mimeType,
    })),
    ...links,
  ];

  return (
    <div className="w-full min-w-0 space-y-4">
      {label && (
        <div>
          <h3 className="text-base font-semibold sm:text-lg">
            {label}
          </h3>
          <p className="mt-1 text-sm text-muted-foreground">
            {description ||
              'ارفع الملفات من الجهاز أو التقط صورة أو أضف رابط Google Drive.'}
          </p>
        </div>
      )}

      <Card className="w-full min-w-0 border-dashed p-3 sm:p-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <button
            type="button"
            disabled={disabled || isUploading}
            onClick={() => fileInputRef.current?.click()}
            className="flex min-h-28 w-full flex-col items-center justify-center rounded-xl border-2 border-dashed p-4 text-center transition hover:bg-muted/30 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isUploading ? (
              <Loader2 className="mb-2 h-7 w-7 animate-spin text-primary" />
            ) : (
              <Upload className="mb-2 h-7 w-7 text-primary" />
            )}

            <span className="font-semibold">
              {isUploading
                ? `جاري رفع ${uploadingCount} ملف...`
                : 'رفع ملفات من الجهاز'}
            </span>

            <span className="mt-1 text-xs text-muted-foreground">
              حتى {maxFiles} ملفات، بحد {maxSizeMB} ميجابايت للملف
            </span>
          </button>

          <button
            type="button"
            disabled={disabled || isUploading}
            onClick={() => cameraInputRef.current?.click()}
            className="flex min-h-28 w-full flex-col items-center justify-center rounded-xl border-2 border-dashed p-4 text-center transition hover:bg-muted/30 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Camera className="mb-2 h-7 w-7 text-primary" />
            <span className="font-semibold">
              التقاط صورة بالكاميرا
            </span>
            <span className="mt-1 text-xs text-muted-foreground">
              متاح على الهواتف والأجهزة المدعومة
            </span>
          </button>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept={accept}
          className="hidden"
          disabled={disabled || isUploading}
          onChange={onFileInputChange}
        />

        <input
          ref={cameraInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          disabled={disabled || isUploading}
          onChange={onFileInputChange}
        />

        <p className="mt-3 break-words text-xs text-muted-foreground">
          الأنواع المسموحة: {acceptedLabel || 'جميع الملفات'}
        </p>
      </Card>

      <div className="flex items-center gap-3">
        <div className="h-px flex-1 bg-border" />
        <span className="text-xs text-muted-foreground">
          أو إضافة رابط
        </span>
        <div className="h-px flex-1 bg-border" />
      </div>

      <Card className="w-full min-w-0 border-dashed p-3 sm:p-4">
        <div className="grid grid-cols-1 items-end gap-3 md:grid-cols-5">
          <div className="space-y-2 md:col-span-2">
            <Label>اسم المرفق</Label>
            <Input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="مثال: صورة الصك"
              disabled={disabled || isUploading}
            />
          </div>

          <div className="space-y-2 md:col-span-2">
            <Label>رابط Google Drive أو رابط مباشر</Label>
            <Input
              value={url}
              onChange={(event) => setUrl(event.target.value)}
              placeholder="https://drive.google.com/..."
              disabled={disabled || isUploading}
              dir="ltr"
            />
          </div>

          <Button
            type="button"
            onClick={addLink}
            disabled={disabled || isUploading}
            className="w-full"
          >
            <Plus className="ml-2 h-4 w-4" />
            إضافة الرابط
          </Button>
        </div>
      </Card>

      {allItems.length > 0 && (
        <div className="space-y-3">
          <h4 className="font-semibold">
            المرفقات ({allItems.length})
          </h4>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {existingFiles.map((file, index) => {
              const item: DriveLinkItem = {
                title: file.name,
                url: file.url,
                driveFileId: file.driveFileId,
                mimeType: file.mimeType,
              };
              const Icon = getFileIcon(item);

              return (
                <Card
                  key={`existing-${file.url}-${index}`}
                  className="overflow-hidden"
                >
                  <FilePreview item={item} Icon={Icon} />

                  <div className="flex items-center gap-3 p-3">
                    <Icon className="h-5 w-5 shrink-0 text-primary" />

                    <div className="min-w-0 flex-1">
                      <p
                        className="truncate text-sm font-medium"
                        title={file.name}
                      >
                        {file.name}
                      </p>

                      <a
                        className="inline-flex items-center gap-1 text-xs text-primary underline"
                        href={file.url}
                        target="_blank"
                        rel="noreferrer"
                      >
                        فتح الملف
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    </div>

                    {onDeleteExisting && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() =>
                          onDeleteExisting(file.url)
                        }
                        disabled={disabled || isUploading}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </Card>
              );
            })}

            {links.map((item, index) => {
              const Icon = getFileIcon(item);

              return (
                <Card
                  key={`${item.url}-${index}`}
                  className="overflow-hidden"
                >
                  <FilePreview item={item} Icon={Icon} />

                  <div className="flex items-center gap-3 p-3">
                    <Icon className="h-5 w-5 shrink-0 text-primary" />

                    <div className="min-w-0 flex-1">
                      <p
                        className="truncate text-sm font-medium"
                        title={item.title}
                      >
                        {item.title}
                      </p>

                      <a
                        className="inline-flex items-center gap-1 text-xs text-primary underline"
                        href={item.url}
                        target="_blank"
                        rel="noreferrer"
                      >
                        فتح الملف
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    </div>

                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeLink(index)}
                      disabled={disabled || isUploading}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

const FilePreview: React.FC<{
  item: DriveLinkItem;
  Icon: React.ComponentType<{ className?: string }>;
}> = ({ item, Icon }) => {
  const previewUrl = getPreviewUrl(item);
  const isPdf =
    item.mimeType === 'application/pdf' ||
    item.title.toLowerCase().endsWith('.pdf');
  const isImage =
    item.mimeType?.startsWith('image/') ||
    /\.(png|jpe?g|webp|gif|bmp|svg|heic|heif)$/i.test(
      item.title
    );

  if (isImage) {
    return (
      <img
        src={previewUrl}
        alt={item.title}
        className="h-40 w-full bg-muted object-contain"
        loading="lazy"
        onError={(event) => {
          if (event.currentTarget.src !== item.url) {
            event.currentTarget.src = item.url;
          }
        }}
      />
    );
  }

  if (isPdf) {
    return (
      <iframe
        src={previewUrl}
        title={item.title}
        className="h-40 w-full bg-white"
      />
    );
  }

  return (
    <div className="flex h-40 w-full flex-col items-center justify-center gap-2 bg-muted/30">
      <Icon className="h-12 w-12 text-muted-foreground" />
      <span className="px-3 text-center text-xs text-muted-foreground">
        تمت إضافة الملف
      </span>
    </div>
  );
};
