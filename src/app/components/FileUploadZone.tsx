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
    // توافق مؤقت مع الصفحات القديمة: لا يوجد رفع ملفات من الواجهة في نسخة الويب.
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

  return (
    <div className="space-y-4">
      {label && (
        <div>
          <h3 className="text-lg font-semibold">{label}</h3>
          <p className="text-sm text-muted-foreground">
            {description || 'أضف رابط Google Drive فقط. لا يوجد رفع ملفات من الواجهة.'}
          </p>
        </div>
      )}

      <Card className="p-4 border-dashed">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-3 items-end">
          <div className="md:col-span-2 space-y-2">
            <Label>اسم المرفق</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="مثال: صورة الصك"
              disabled={disabled}
            />
          </div>
          <div className="md:col-span-2 space-y-2">
            <Label>رابط Google Drive</Label>
            <Input
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://drive.google.com/..."
              disabled={disabled}
              dir="ltr"
            />
          </div>
          <Button type="button" onClick={addLink} disabled={disabled}>
            <Plus className="h-4 w-4 ml-2" />
            إضافة رابط
          </Button>
        </div>
      </Card>

      {(links.length > 0 || existingFiles.length > 0) && (
        <div className="space-y-3">
          <h4 className="font-semibold">المرفقات ({links.length + existingFiles.length})</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {existingFiles.map((file, index) => (
              <Card key={`existing-${index}`} className="p-4">
                <div className="flex items-center gap-3">
                  <LinkIcon className="h-6 w-6 text-primary" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{file.name}</p>
                    <a className="text-xs text-primary underline" href={file.url} target="_blank" rel="noreferrer">
                      فتح الرابط
                    </a>
                  </div>
                  {onDeleteExisting && (
                    <Button type="button" variant="ghost" size="sm" onClick={() => onDeleteExisting(file.url)}>
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
                    <a className="text-xs text-primary underline inline-flex items-center gap-1" href={item.url} target="_blank" rel="noreferrer">
                      فتح الرابط <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                  <Button type="button" variant="ghost" size="sm" onClick={() => removeLink(index)}>
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
