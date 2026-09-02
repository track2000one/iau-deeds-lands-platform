import fs from 'node:fs';

const file = 'src/app/components/MosqueFieldVisitsPanel.tsx';
let source = fs.readFileSync(file, 'utf8');

const replaceOnce = (from, to, label) => {
  if (source.includes(to)) return;
  const index = source.indexOf(from);
  if (index < 0) throw new Error(`Patch target not found: ${label}`);
  source = source.slice(0, index) + to + source.slice(index + from.length);
};

replaceOnce(
  "const getItemStatusOptions = (item: MosqueFieldVisitItem): ItemStatusOption[] => {",
  `const ACTIVITY_APPROVAL_ITEM_TITLE = 'اعتماد حلقات التحفيظ والمحاضرات والأنشطة القائمة';
const isActivityApprovalItem = (item: Pick<MosqueFieldVisitItem, 'title'>) => item.title === ACTIVITY_APPROVAL_ITEM_TITLE;
const isImageEvidence = (item: MosqueFieldVisitImage) => String(item.mimeType || '').startsWith('image/') || /\\.(jpe?g|png|webp|gif)$/i.test(String(item.fileName || ''));
const isPdfEvidence = (item: MosqueFieldVisitImage) => item.mimeType === 'application/pdf' || /\\.pdf$/i.test(String(item.fileName || ''));

const getItemStatusOptions = (item: MosqueFieldVisitItem): ItemStatusOption[] => {`,
  'activity approval helpers',
);

replaceOnce(
  "  const removeItemImage = (index: number, phase: 'beforeImages' | 'afterImages', imageIndex: number) => {",
  `  const uploadActivityApprovalEvidence = async (index: number, files: FileList | null) => {
    const selected = Array.from(files || []);
    if (!selected.length) return;
    const allowedTypes = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'application/pdf']);
    const invalid = selected.find((file) => !allowedTypes.has(file.type));
    if (invalid) {
      toast.error(\`الملف \${invalid.name} غير مدعوم. المسموح صور JPG وPNG وWEBP وGIF أو ملفات PDF\`);
      return;
    }
    const oversized = selected.find((file) => file.size > 20 * 1024 * 1024);
    if (oversized) {
      toast.error(\`حجم الملف \${oversized.name} يتجاوز الحد الأعلى 20 ميجابايت\`);
      return;
    }
    if ((visitForm.items[index].beforeImages?.length || 0) + selected.length > 20) {
      toast.error('الحد الأعلى لمرفقات اعتماد النشاط هو 20 ملفًا');
      return;
    }

    const key = \`\${index}-activityApprovalEvidence\`;
    try {
      setUploadingKey(key);
      const uploaded: MosqueFieldVisitImage[] = [];
      for (const file of selected) {
        const result = await mosqueApi.upload(file);
        uploaded.push({
          url: result.driveUrl,
          fileId: result.driveFileId || null,
          fileName: result.fileName || file.name,
          mimeType: result.mimeType || file.type,
          fileSize: file.size,
          capturedAt: new Date().toISOString(),
        });
      }
      setVisitItem(index, { beforeImages: [...(visitForm.items[index].beforeImages || []), ...uploaded] });
      toast.success(\`تم رفع \${uploaded.length} مرفق لاعتماد النشاط\`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'تعذر رفع مرفقات اعتماد النشاط');
    } finally {
      setUploadingKey('');
    }
  };

  const removeItemImage = (index: number, phase: 'beforeImages' | 'afterImages', imageIndex: number) => {`,
  'activity approval uploader',
);

replaceOnce(
  "? visitForm.items.find((item) => item.status === 'needs_action' && !(item.beforeImages || []).length)",
  "? visitForm.items.find((item) => item.status === 'needs_action' && !isActivityApprovalItem(item) && !(item.beforeImages || []).length)",
  'before evidence validation',
);

replaceOnce(
  "      item.status === 'needs_action'\n      && item.resolutionStatus === 'closed'",
  "      item.status === 'needs_action'\n      && !isActivityApprovalItem(item)\n      && item.resolutionStatus === 'closed'",
  'after evidence validation',
);

replaceOnce(
  "        ...(item.beforeImages || []).map((attachment) => ({ attachment, label: `قبل المعالجة — ${item.title}` })),\n        ...(item.afterImages || []).map((attachment) => ({ attachment, label: `بعد المعالجة — ${item.title}` })),",
  "        ...(item.beforeImages || []).filter(isImageEvidence).map((attachment) => ({ attachment, label: isActivityApprovalItem(item) ? `مرفق اعتماد — ${item.title}` : `قبل المعالجة — ${item.title}` })),\n        ...(item.afterImages || []).filter(isImageEvidence).map((attachment) => ({ attachment, label: `بعد المعالجة — ${item.title}` })),",
  'print image filtering',
);

replaceOnce(
  "    const pdfAttachments = (visit.attachments || []).filter((attachment) => attachment.mimeType === 'application/pdf' || /\\.pdf$/i.test(String(attachment.fileName || '')));",
  `    const pdfAttachments = [
      ...(visit.attachments || []).filter((attachment) => attachment.mimeType === 'application/pdf' || /\\.pdf$/i.test(String(attachment.fileName || ''))),
      ...selectedItems.flatMap((item) => isActivityApprovalItem(item)
        ? (item.beforeImages || []).filter(isPdfEvidence).map((attachment) => ({ ...attachment, description: \`مرفق اعتماد — \${item.title}\` }))
        : []),
    ];`,
  'print activity pdfs',
);

replaceOnce(
  "        case 'treatment_images': return `${item.beforeImages?.length || 0}/${item.afterImages?.length || 0}`;",
  "        case 'treatment_images': return isActivityApprovalItem(item) ? `${item.beforeImages?.length || 0} مرفق` : `${item.beforeImages?.length || 0}/${item.afterImages?.length || 0}`;",
  'report evidence label',
);

replaceOnce(
  "      before: await Promise.all((item.beforeImages || []).map(prepareImage)),\n      after: await Promise.all((item.afterImages || []).map(prepareImage)),",
  "      before: await Promise.all((item.beforeImages || []).filter(isImageEvidence).map(prepareImage)),\n      after: await Promise.all((item.afterImages || []).filter(isImageEvidence).map(prepareImage)),",
  'treatment report image filtering',
);

replaceOnce(
  "    ...configuredPrintItems.flatMap((item) => [...(item.beforeImages || []), ...(item.afterImages || [])]),\n  ].length : 0;\n  const printPdfCount = printTarget ? (printTarget.attachments || []).filter((attachment) => attachment.mimeType === 'application/pdf' || /\\.pdf$/i.test(String(attachment.fileName || ''))).length : 0;",
  `    ...configuredPrintItems.flatMap((item) => [...(item.beforeImages || []), ...(item.afterImages || [])].filter(isImageEvidence)),
  ].length : 0;
  const printPdfCount = printTarget
    ? (printTarget.attachments || []).filter((attachment) => attachment.mimeType === 'application/pdf' || /\\.pdf$/i.test(String(attachment.fileName || ''))).length
      + configuredPrintItems.flatMap((item) => isActivityApprovalItem(item) ? (item.beforeImages || []).filter(isPdfEvidence) : []).length
    : 0;`,
  'print counts',
);

replaceOnce(
  "                {(item.beforeImages.length > 0 || item.afterImages.length > 0) && <div className=\"grid gap-3 border-t pt-3 sm:grid-cols-2\"><VisitImages label=\"صور قبل المعالجة\" images={item.beforeImages} /><VisitImages label=\"صور بعد المعالجة\" images={item.afterImages} /></div>}",
  "                {isActivityApprovalItem(item) ? (item.beforeImages.length > 0 && <div className=\"border-t pt-3\"><VisitImages label=\"مرفقات اعتماد النشاط\" images={item.beforeImages} /></div>) : ((item.beforeImages.length > 0 || item.afterImages.length > 0) && <div className=\"grid gap-3 border-t pt-3 sm:grid-cols-2\"><VisitImages label=\"صور قبل المعالجة\" images={item.beforeImages} /><VisitImages label=\"صور بعد المعالجة\" images={item.afterImages} /></div>)}",
  'view activity evidence',
);

replaceOnce(
  "</NativeSelect></div>{item.status === 'needs_action' && <div className=\"grid gap-3 border-t border-amber-200 pt-3 md:grid-cols-2\">",
  `</NativeSelect></div>{isActivityApprovalItem(item) && !['not_available', 'not_applicable', 'not_checked'].includes(item.status) && <ActivityApprovalEvidenceField files={item.beforeImages || []} loading={uploadingKey === \`\${index}-activityApprovalEvidence\`} onFiles={(files) => void uploadActivityApprovalEvidence(index, files)} onRemove={(fileIndex) => removeItemImage(index, 'beforeImages', fileIndex)} />}{item.status === 'needs_action' && <div className="grid gap-3 border-t border-amber-200 pt-3 md:grid-cols-2">`,
  'activity evidence field placement',
);

replaceOnce(
  "<div className=\"md:col-span-2 rounded-2xl border border-emerald-200 bg-white p-3\"><div className=\"mb-3 flex flex-wrap items-center justify-between gap-2\">",
  "<div className={isActivityApprovalItem(item) ? 'hidden' : 'md:col-span-2 rounded-2xl border border-emerald-200 bg-white p-3'}><div className=\"mb-3 flex flex-wrap items-center justify-between gap-2\">",
  'hide before after for activity approval',
);

replaceOnce(
  "const ImageField: React.FC<{",
  `const ActivityApprovalEvidenceField: React.FC<{
  files: MosqueFieldVisitImage[];
  loading: boolean;
  onFiles: (files: FileList | null) => void;
  onRemove: (index: number) => void;
}> = ({ files, loading, onFiles, onRemove }) => <div className="rounded-2xl border border-indigo-200 bg-indigo-50/35 p-3">
  <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
    <div>
      <b className="text-sm text-indigo-950">مرفقات اعتماد حلقات التحفيظ والمحاضرات والأنشطة</b>
      <p className="mt-1 text-[11px] leading-5 text-slate-500">لا يتطلب هذا البند صور قبل وبعد. أرفق صورة أو ملف PDF المتعلق بالاعتماد أو الموافقة أو المستند المؤيد.</p>
    </div>
    <Badge variant="outline" className="border-indigo-200 bg-white text-indigo-700">{files.length} مرفق</Badge>
  </div>
  <label className={\`flex cursor-pointer items-center justify-center gap-2 rounded-xl border-2 border-dashed p-4 text-xs font-bold transition \${loading ? 'cursor-wait border-indigo-300 bg-white' : 'border-indigo-300 bg-white text-indigo-700 hover:bg-indigo-50'}\`}>
    {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Paperclip className="h-4 w-4" />}
    {loading ? 'جاري رفع المرفقات...' : 'رفع صورة / PDF خاص بالاعتماد'}
    <input type="file" accept="image/jpeg,image/png,image/webp,image/gif,application/pdf" multiple className="hidden" disabled={loading} onChange={(event) => { onFiles(event.target.files); event.target.value = ''; }} />
  </label>
  {files.length > 0 && <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
    {files.map((file, index) => <div key={\`\${file.fileId || file.url}-\${index}\`} className="relative overflow-hidden rounded-xl border bg-white shadow-sm">
      <a href={file.url} target="_blank" rel="noreferrer" className="block h-28 overflow-hidden bg-slate-50"><AttachmentPreview attachment={file} /></a>
      <button type="button" aria-label="حذف المرفق" title="حذف المرفق" className="absolute left-2 top-2 flex h-6 w-6 items-center justify-center rounded-full bg-red-600 text-sm font-bold text-white shadow hover:bg-red-700" onClick={() => onRemove(index)}>×</button>
      <div className="border-t px-2 py-1.5"><p className="truncate text-[10px] font-semibold text-slate-700" title={file.fileName || ''}>{file.fileName || (isPdfEvidence(file) ? 'ملف PDF' : 'صورة اعتماد')}</p></div>
    </div>)}
  </div>}
</div>;

const ImageField: React.FC<{`,
  'activity evidence component',
);

fs.writeFileSync(file, source);
console.log('Applied activity approval evidence behavior successfully.');
