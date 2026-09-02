from pathlib import Path

path = Path('src/app/components/MosqueFieldVisitsPanel.tsx')
text = path.read_text(encoding='utf-8')
marker = "const ImageField: React.FC<{"
start = text.find(marker)
if start == -1:
    raise SystemExit('ImageField marker not found')

replacement = r'''const FieldVisitImagePreview: React.FC<{ image: MosqueFieldVisitImage }> = ({ image }) => {
  const [previewUrl, setPreviewUrl] = React.useState(image.fileId ? '' : image.url);
  const [failed, setFailed] = React.useState(false);

  React.useEffect(() => {
    let active = true;
    let objectUrl = '';
    setFailed(false);

    if (!image.fileId) {
      setPreviewUrl(image.url);
      return () => { active = false; };
    }

    setPreviewUrl('');
    void mosqueApi.mediaBlob(image.fileId).then((blob) => {
      if (!active) return;
      objectUrl = URL.createObjectURL(blob);
      setPreviewUrl(objectUrl);
    }).catch(() => {
      if (active) setFailed(true);
    });

    return () => {
      active = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [image.fileId, image.url]);

  if (failed) {
    return <div className="flex h-28 w-full flex-col items-center justify-center rounded-lg bg-slate-100 text-slate-500"><ImageIcon className="h-7 w-7 text-sky-600" /><span className="mt-1 text-[10px] font-semibold">تعذرت معاينة الصورة</span></div>;
  }

  if (!previewUrl) {
    return <div className="flex h-28 w-full items-center justify-center rounded-lg bg-slate-100"><Loader2 className="h-5 w-5 animate-spin text-sky-700" /></div>;
  }

  return <a href={previewUrl} target="_blank" rel="noreferrer" className="block overflow-hidden rounded-lg bg-slate-50" title="فتح الصورة بالحجم الكامل"><img src={previewUrl} alt={image.fileName || 'صورة مرفوعة'} className="h-28 w-full object-contain" loading="lazy" onError={() => setFailed(true)} /></a>;
};

const ImageField: React.FC<{
  label: string;
  images: MosqueFieldVisitImage[];
  loading: boolean;
  onFiles: (files: FileList | null) => void;
  onRemove: (index: number) => void;
}> = ({ label, images, loading, onFiles, onRemove }) => <div className="rounded-xl border bg-white p-3">
  <div className="mb-2 flex items-center justify-between"><Label className="text-xs font-bold">{label}</Label><Badge variant="outline">{images.length}</Badge></div>
  <label className="flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed p-3 text-xs font-semibold text-sky-700 hover:bg-sky-50">
    {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
    {loading ? 'جاري الرفع...' : 'التقاط / اختيار صور'}
    <input type="file" accept="image/*" capture="environment" multiple className="hidden" disabled={loading} onChange={(event) => { onFiles(event.target.files); event.target.value = ''; }} />
  </label>
  {images.length > 0 && <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
    {images.map((image, index) => <div key={`${image.fileId || image.url}-${index}`} className="relative overflow-hidden rounded-xl border bg-white p-1.5 shadow-sm">
      <FieldVisitImagePreview image={image} />
      <button type="button" aria-label="حذف الصورة" title="حذف الصورة" className="absolute left-2 top-2 flex h-6 w-6 items-center justify-center rounded-full bg-red-600 text-sm font-bold text-white shadow hover:bg-red-700" onClick={() => onRemove(index)}>×</button>
      <div className="mt-1.5 min-w-0 px-1">
        <p className="truncate text-[10px] font-semibold text-slate-700" title={image.fileName || `صورة ${index + 1}`}>{image.fileName || `صورة ${index + 1}`}</p>
        {image.capturedAt && <p className="mt-0.5 text-[9px] text-slate-400">{new Date(image.capturedAt).toLocaleString('ar-SA-u-ca-gregory')}</p>}
      </div>
    </div>)}
  </div>}
</div>;
'''

path.write_text(text[:start] + replacement, encoding='utf-8')
print('Updated field visit image previews')
