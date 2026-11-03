import React, { useRef, useState } from 'react';
import { Download, FileText, LoaderCircle, Paperclip, Trash2, UploadCloud, X } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from './ui/button';
import { mosqueApi, type CentralBuildingDocument } from '../api/mosques';

const MAX_DOCUMENT_SIZE = 12 * 1024 * 1024;
const MAX_DOCUMENT_TOTAL = 40;
const MAX_SELECTION = 8;
const MIME_BY_EXTENSION: Record<string, string> = {
  pdf: 'application/pdf',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
};

type Props = {
  buildingId?: string | null;
  documents?: CentralBuildingDocument[] | null;
  editable?: boolean;
  blocked?: boolean;
  pendingFiles: File[];
  onPendingFilesChange: (files: File[]) => void;
  onDocumentsChange?: (documents: CentralBuildingDocument[]) => void;
};

const validFile = (file: File): File | null => {
  const extension = file.name.toLowerCase().split('.').pop() || '';
  const expectedMime = MIME_BY_EXTENSION[extension];
  if (!expectedMime || file.size === 0 || file.size > MAX_DOCUMENT_SIZE) return null;
  if (file.type && file.type !== expectedMime && file.type !== 'application/octet-stream') return null;
  return file.type === expectedMime ? file : new File([file], file.name, { type: expectedMime, lastModified: file.lastModified });
};

export function CentralBuildingDocuments({
  buildingId,
  documents = [],
  editable = false,
  blocked = false,
  pendingFiles,
  onPendingFilesChange,
  onDocumentsChange,
}: Props) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const existing = documents || [];

  const selectFiles = (list: FileList | null) => {
    if (!list?.length) return;
    const candidates = Array.from(list);
    const accepted = candidates.map(validFile).filter((file): file is File => Boolean(file));
    if (accepted.length !== candidates.length) {
      toast.error('تُقبل ملفات PDF وWord DOCX وExcel XLSX حتى 12 ميجابايت لكل ملف.');
    }
    const next = [...pendingFiles];
    for (const file of accepted) {
      if (next.length >= MAX_SELECTION || next.length + existing.length >= MAX_DOCUMENT_TOTAL) break;
      if (!next.some((item) => item.name === file.name && item.size === file.size && item.lastModified === file.lastModified)) next.push(file);
    }
    if (next.length < accepted.length + pendingFiles.length) toast.info('يمكن اختيار 8 ملفات لكل دفعة، وبحد إجمالي 40 ملفًا للمبنى.');
    onPendingFilesChange(next);
    if (inputRef.current) inputRef.current.value = '';
  };

  const download = async (document: CentralBuildingDocument) => {
    if (!buildingId || downloadingId) return;
    setDownloadingId(document.id);
    try {
      const blob = await mosqueApi.buildingDocumentBlob(buildingId, document.id);
      const url = URL.createObjectURL(blob);
      const link = window.document.createElement('a');
      link.href = url;
      link.download = document.fileName || 'building-document';
      window.document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'تعذر تنزيل المستند');
    } finally {
      setDownloadingId(null);
    }
  };

  const removeDocument = async (document: CentralBuildingDocument) => {
    if (!buildingId || deletingId || blocked || !window.confirm('هل تريد حذف هذا المستند نهائيًا من سجل المبنى؟')) return;
    setDeletingId(document.id);
    try {
      const result = await mosqueApi.deleteBuildingDocument(buildingId, document.id);
      onDocumentsChange?.(result.documents);
      toast.success('تم حذف المرفق');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'تعذر حذف المرفق');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <section className="space-y-3 rounded-2xl border border-slate-300 bg-muted/15 p-3 sm:p-4" dir="rtl">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="flex items-center gap-2 text-sm font-black text-foreground">
            <Paperclip className="h-5 w-5 text-primary" /> مرفقات المبنى
            <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs">{existing.length} ملف محفوظ</span>
          </h3>
          <p className="mt-1 text-xs text-muted-foreground">مستندات خاصة مرتبطة برقم المبنى، ويمكن للمصرح لهم تنزيلها فقط.</p>
        </div>
        {editable && (
          <div>
            <input ref={inputRef} type="file" multiple className="hidden"
              accept=".pdf,.docx,.xlsx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
              aria-label="اختيار مرفقات المبنى" onChange={(event) => selectFiles(event.currentTarget.files)} />
            <Button type="button" size="sm" variant="outline"
              disabled={blocked || existing.length >= MAX_DOCUMENT_TOTAL}
              onClick={() => inputRef.current?.click()}>
              <UploadCloud className="h-4 w-4" /> اختيار ملفات من الجهاز
            </Button>
          </div>
        )}
      </div>

      {existing.length ? (
        <div className="space-y-2">
          {existing.map((file) => (
            <div key={file.id} className="flex items-center justify-between gap-2 rounded-xl border bg-background p-2.5">
              <div className="flex min-w-0 items-center gap-2">
                <FileText className="h-5 w-5 shrink-0 text-sky-700" />
                <div className="min-w-0">
                  <p className="truncate text-xs font-bold" title={file.fileName}>{file.fileName}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {file.uploadedByName ? file.uploadedByName + ' · ' : ''}
                    {file.uploadedAt ? new Date(file.uploadedAt).toLocaleDateString('ar-SA') : ''}
                    {file.fileSize ? ' · ' + (file.fileSize / (1024 * 1024)).toFixed(1) + ' MB' : ''}
                  </p>
                </div>
              </div>
              <div className="flex shrink-0 gap-1">
                <Button size="sm" variant="outline" disabled={Boolean(downloadingId)}
                  onClick={() => void download(file)}>
                  {downloadingId === file.id ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                  تنزيل
                </Button>
                {editable && (
                  <Button size="sm" variant="outline" className="text-red-600"
                    disabled={blocked || Boolean(deletingId)} onClick={() => void removeDocument(file)}>
                    {deletingId === file.id ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                    حذف
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-xl border border-dashed p-4 text-center text-xs text-muted-foreground">
          لا توجد مستندات محفوظة لهذا المبنى.
        </div>
      )}

      {editable && pendingFiles.length > 0 && (
        <div className="space-y-2 rounded-xl border border-emerald-200 bg-emerald-50/30 p-3">
          <p className="text-sm font-bold">مرفقات جاهزة للحفظ ({pendingFiles.length})</p>
          {pendingFiles.map((file, index) => (
            <div key={file.name + file.lastModified + index} className="flex items-center justify-between gap-2 text-xs">
              <span className="min-w-0 truncate">{file.name} — {(file.size / (1024 * 1024)).toFixed(1)} MB</span>
              <button type="button" disabled={blocked} title="إزالة من الاختيار"
                onClick={() => onPendingFilesChange(pendingFiles.filter((_, i) => i !== index))}>
                <X className="h-4 w-4 text-red-600" />
              </button>
            </div>
          ))}
          <p className="text-[11px] text-muted-foreground">تُرفع هذه الملفات عند الضغط على «حفظ المبنى». ولن تُحذف المرفقات السابقة.</p>
        </div>
      )}
      {editable && <p className="text-[11px] text-muted-foreground">الحد الأعلى: 40 مرفقًا للمبنى، 8 ملفات في كل دفعة، و12 ميجابايت للملف.</p>}
    </section>
  );
}
