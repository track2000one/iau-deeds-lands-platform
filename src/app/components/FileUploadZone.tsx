import React, { useState } from 'react';
import { Link as LinkIcon, Plus, X, ExternalLink } from 'lucide-react';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { toast } from 'sonner';

interface DriveLinkItem {
  title: string;
  url: string;
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

const isValidDriveOrHttpUrl = (value: string) => {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' || url.protocol === 'http:';
  } catch {
    return false;
  }
};

export const FileUploadZone: React.FC<FileUploadZoneProps> = ({
  onFilesChange,
  onLinksChange,
  existingFiles = [],
  onDeleteExisting,
  maxFiles = 10,
  label,
  description,
  disabled = false,
}) => {
  const [links, setLinks] = useState<DriveLinkItem[]>([]);
  const [title, setTitle] = useState('');
  const [url, setUrl] = useState('');

  const updateLinks = (next: DriveLinkItem[]) => {
    setLinks(next);
    onLinksChange?.(next);
    onFilesChange?.([]);
  };

  const addLink = () => {
    if (disabled) return;
    if (links.length + existingFiles.length >= maxFiles) {
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
    updateLinks([...links, { title: title.trim(), url: url.trim() }]);
    setTitle('');
    setUrl('');
  };

  const removeLink = (index: number) => {
    updateLinks(links.filter((_, itemIndex) => itemIndex !== index));
  };

  return (
    <div className="space-y-4">
      {label && (
        <div>
          <h3 className="text-lg font-semibold">{label}</h3>
          <p className="text-sm text-muted-foreground">
            {description || 'ألصق رابط Google Drive للمرفق. لا يوجد رفع ملفات مباشر من المنصة.'}
          </p>
        </div>
      )}

      <Card className="border-dashed p-4">
        <div className="grid grid-cols-1 items-end gap-3 md:grid-cols-5">
          <div className="space-y-2 md:col-span-2">
            <Label>اسم المرفق</Label>
            <Input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="مثال: صورة الصك"
              disabled={disabled}
            />
          </div>

          <div className="space-y-2 md:col-span-2">
            <Label>رابط Google Drive</Label>
            <Input
              value={url}
              onChange={(event) => setUrl(event.target.value)}
              placeholder="https://drive.google.com/..."
              disabled={disabled}
              dir="ltr"
            />
          </div>

          <Button type="button" onClick={addLink} disabled={disabled}>
            <Plus className="ml-2 h-4 w-4" />
            إضافة الرابط
          </Button>
        </div>
      </Card>

      {(links.length > 0 || existingFiles.length > 0) && (
        <div className="space-y-3">
          <h4 className="font-semibold">
            المرفقات ({links.length + existingFiles.length})
          </h4>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {existingFiles.map((file, index) => (
              <Card key={`existing-${index}`} className="p-4">
                <div className="flex items-center gap-3">
                  <LinkIcon className="h-6 w-6 text-primary" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{file.name}</p>
                    <a
                      className="inline-flex items-center gap-1 text-xs text-primary underline"
                      href={file.url}
                      target="_blank"
                      rel="noreferrer"
                    >
                      فتح الرابط
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                  {onDeleteExisting && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => onDeleteExisting(file.url)}
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
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{item.title}</p>
                    <a
                      className="inline-flex items-center gap-1 text-xs text-primary underline"
                      href={item.url}
                      target="_blank"
                      rel="noreferrer"
                    >
                      فتح الرابط
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removeLink(index)}
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
