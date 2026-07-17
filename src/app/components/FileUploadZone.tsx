import React, { useRef, useState } from 'react';
import {
  Link as LinkIcon,
  Plus,
  X,
  ExternalLink,
  Upload,
  Loader2,
  FileText,
} from 'lucide-react';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { toast } from 'sonner';

interface DriveLinkItem {
  title: string;
  url: string;
}

interface UploadResponse {
  fileName: string;
  driveUrl: string;
  driveFileId: string;
  mimeType: string;
  attachment?: unknown;
}

interface FileUploadZoneProps {
  onFilesChange?: (files: File[]) => void;
  onLinksChange?: (links: DriveLinkItem[]) => void;
  existingFiles?: { url: string; name: string }[];
  onDeleteExisting?: (url: string) => void;
  maxFiles?: number;
  maxSizeMB?: number;
  accept?: string;
  label?: string;
  description?: string;
  disabled?: boolean;
}

const API_BASE_URL = import.meta.env.VITE_API_URL?.replace(/\/$/, '') || '';

const isValidDriveOrHttpUrl = (value: string) => {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' || url.protocol === 'http:';
  } catch {
    return false;
  }
};

const getDisplayNameFromFileName = (fileName: string) => {
  const cleanName = fileName.replace(/^\d{4}-\d{2}-\d{2}T[\d-]+Z-/, '');
  return cleanName || fileName;
};

export const FileUploadZone: React.FC<FileUploadZoneProps> = ({
  onFilesChange,
  onLinksChange,
  existingFiles = [],
  onDeleteExisting,
  maxFiles = 10,
  maxSizeMB = 20,
  accept = 'image/*,.pdf',
  label,
  description,
  disabled = false,
}) => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [links, setLinks] = useState<DriveLinkItem[]>([]);
  const [title, setTitle] = useState('');
  const [url, setUrl] = useState('');
  const [isUploading, setIsUploading] = useState(false);

  const updateLinks = (next: DriveLinkItem[]) => {
    setLinks(next);
    onLinksChange?.(next);

    // توافق مؤقت مع الصفحات القديمة: الرفع في نسخة الويب يتم عبر Google Drive.
    onFilesChange?.([]);
  };

  const addLink = () => {
    if (disabled || isUploading) return;

    if (links.length + existingFiles.length >= maxFiles) {
      toast.error(`الحد الأعلى للمرفقات هو ${maxFiles}`);
      return;
    }

    if (!title.trim()) {
      toast.error('أدخل اسم المرفق');
      return;
    }

    if (!isValidDriveOrHttpUrl(url.trim())) {
      toast.error('أدخل رابط Google Drive صحيح');
      return;
    }

    updateLinks([...links, { title: title.trim(), url: url.trim() }]);
    setTitle('');
    setUrl('');
  };

  const removeLink = (index: number) => {
    updateLinks(links.filter((_, i) => i !== index));
  };

  const openFilePicker = () => {
    if (disabled || isUploading) return;
    fileInputRef.current?.click();
  };

  const uploadOneFile = async (file: File): Promise<DriveLinkItem> => {
    if (!API_BASE_URL) {
      throw new Error('VITE_API_URL غير موجود. تأكد من ربط الواجهة بالـ Backend في Railway.');
    }

    if (file.size > maxSizeMB * 1024 * 1024) {
      throw new Error(`حجم الملف ${file.name} أكبر من الحد المسموح ${maxSizeMB}MB`);
    }

    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch(`${API_BASE_URL}/api/uploads`, {
      method: 'POST',
      body: formData,
    });

    let body: UploadResponse | { message?: string };

    try {
      body = await response.json();
    } catch {
      body = {};
    }

    if (!response.ok) {
      throw new Error((body as { message?: string }).message || 'تعذر رفع الملف إلى Google Drive');
    }

    const uploaded = body as UploadResponse;

    if (!uploaded.driveUrl) {
      throw new Error('تم رفع الملف لكن لم يتم إرجاع رابط Google Drive');
    }

    return {
      title: getDisplayNameFromFileName(uploaded.fileName || file.name),
      url: uploaded.driveUrl,
    };
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(event.target.files || []);

    event.target.value = '';

    if (disabled || selectedFiles.length === 0) return;

    if (links.length + existingFiles.length + selectedFiles.length > maxFiles) {
      toast.error(`الحد الأعلى للمرفقات هو ${maxFiles}`);
      return;
    }

    try {
      setIsUploading(true);

      const uploadedLinks: DriveLinkItem[] = [];

      for (const file of selectedFiles) {
        const uploadedLink = await uploadOneFile(file);
        uploadedLinks.push(uploadedLink);
      }

      updateLinks([...links, ...uploadedLinks]);

      toast.success(
        selectedFiles.length === 1
          ? 'تم رفع الملف إلى Google Drive بنجاح'
          : `تم رفع ${selectedFiles.length} ملفات إلى Google Drive بنجاح`
      );
    } catch (error) {
      console.error('Upload failed:', error);
      toast.error(error instanceof Error ? error.message : 'تعذر رفع الملف');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="space-y-4">
      {label && (
        <div>
          <h3 className="text-lg font-semibold">{label}</h3>
          <p className="text-sm text-muted-foreground">
            {description || 'ارفع الملفات مباشرة إلى Google Drive أو أضف رابطًا يدويًا.'}
          </p>
        </div>
      )}

      <Card className="p-4 border-dashed">
        <div className="flex flex-col gap-4">
          <div className="flex flex-col md:flex-row gap-3 md:items-center md:justify-between">
            <div className="space-y-1">
              <p className="text-sm font-medium">رفع ملف إلى Google Drive</p>
              <p className="text-xs text-muted-foreground">
                الحد الأعلى للحجم: {maxSizeMB}MB — العدد الأقصى: {maxFiles}
              </p>
            </div>

            <Button
              type="button"
              onClick={openFilePicker}
              disabled={disabled || isUploading}
              className="w-full md:w-auto"
            >
              {isUploading ? (
                <Loader2 className="h-4 w-4 ml-2 animate-spin" />
              ) : (
                <Upload className="h-4 w-4 ml-2" />
              )}
              {isUploading ? 'جاري الرفع...' : 'رفع ملف'}
            </Button>

            <input
              ref={fileInputRef}
              type="file"
              accept={accept}
              multiple
              className="hidden"
              onChange={handleFileChange}
              disabled={disabled || isUploading}
            />
          </div>

          <div className="border-t pt-4">
            <p className="text-sm font-medium mb-3">أو إضافة رابط يدوي</p>

            <div className="grid grid-cols-1 md:grid-cols-5 gap-3 items-end">
              <div className="md:col-span-2 space-y-2">
                <Label>اسم المرفق</Label>
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="مثال: صورة الصك"
                  disabled={disabled || isUploading}
                />
              </div>

              <div className="md:col-span-2 space-y-2">
                <Label>رابط Google Drive</Label>
                <Input
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://drive.google.com/..."
                  disabled={disabled || isUploading}
                  dir="ltr"
                />
              </div>

              <Button type="button" onClick={addLink} disabled={disabled || isUploading}>
                <Plus className="h-4 w-4 ml-2" />
                إضافة رابط
              </Button>
            </div>
          </div>
        </div>
      </Card>

      {(links.length > 0 || existingFiles.length > 0) && (
        <div className="space-y-3">
          <h4 className="font-semibold">المرفقات ({links.length + existingFiles.length})</h4>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {existingFiles.map((file, index) => (
              <Card key={`existing-${index}`} className="p-4">
                <div className="flex items-center gap-3">
                  <FileText className="h-6 w-6 text-primary" />

                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{file.name}</p>
                    <a
                      className="text-xs text-primary underline inline-flex items-center gap-1"
                      href={file.url}
                      target="_blank"
                      rel="noreferrer"
                    >
                      فتح الرابط <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>

                  {onDeleteExisting && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => onDeleteExisting(file.url)}
                      disabled={disabled || isUploading}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </Card>
            ))}

            {links.map((item, index) => (
              <Card key={`${item.url}-${index}`} className="p-4">
                <div className="flex items-center gap-3">
                  <LinkIcon className="h-6 w-6 text-primary" />

                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{item.title}</p>
                    <a
                      className="text-xs text-primary underline inline-flex items-center gap-1"
                      href={item.url}
                      target="_blank"
                      rel="noreferrer"
                    >
                      فتح الرابط <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>

                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removeLink(index)}
                    disabled={disabled || isUploading}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
