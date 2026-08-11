const fs = require('fs');

function replaceOnce(source, before, after, label) {
  if (!source.includes(before)) throw new Error(`Patch target not found: ${label}`);
  return source.replace(before, after);
}

const pagePath = 'src/app/pages/AddAssetPage.tsx';
let page = fs.readFileSync(pagePath, 'utf8');

page = replaceOnce(page,
`  const [smartSourceFile, setSmartSourceFile] = useState<File | null>(null);`,
`  const [smartSourceFiles, setSmartSourceFiles] = useState<File[]>([]);`,
'smart source state');

page = replaceOnce(page,
`  const handleSmartExtraction = async (file: File | null) => {
    if (!file || smartExtracting) return;
    const isPdf = file.type === 'application/pdf' || /\\.pdf$/i.test(file.name);
    const isImage = file.type.startsWith('image/');
    if (!isPdf && !isImage) {
      setSmartExtractionMessage('الملف غير مدعوم. استخدم صورة JPG/PNG/WEBP أو ملف PDF.');
      return;
    }
    if (file.size > 12 * 1024 * 1024) {
      setSmartExtractionMessage('حجم الملف أكبر من 12MB. يرجى استخدام ملف أصغر.');
      return;
    }

    setSmartSourceFile(file);
    setSmartExtraction(null);
    setSmartExtractionMessage('جارٍ قراءة المستند وتحليل بيانات الأصل...');
    setSmartExtracting(true);
    try {
      const result = await extractAssetData(file);
      setSmartExtraction(result);
      const found = Object.values(result.fields || {}).filter((value) => value !== null && value !== undefined && String(value).trim() !== '').length;
      setSmartExtractionMessage(found ? ('تم استخراج ' + found.toLocaleString('ar-SA') + ' حقل. راجع النتائج ثم طبّقها على النموذج.') : 'تمت قراءة الملف، لكن لم يتم العثور على بيانات أصل واضحة بما يكفي.');
    } catch (smartError: any) {
      setSmartExtractionMessage(String(smartError?.message || 'تعذر قراءة الملف واستخراج البيانات.'));
    } finally {
      setSmartExtracting(false);
      if (smartFileInputRef.current) smartFileInputRef.current.value = '';
      if (smartCameraInputRef.current) smartCameraInputRef.current.value = '';
    }
  };`,
`  const addSmartSourceFiles = (incoming: FileList | File[] | null) => {
    if (!incoming || smartExtracting) return;
    const candidates = Array.from(incoming);
    if (!candidates.length) return;

    const valid: File[] = [];
    const rejected: string[] = [];
    candidates.forEach((file) => {
      const isPdf = file.type === 'application/pdf' || /\\.pdf$/i.test(file.name);
      const isImage = file.type.startsWith('image/');
      if (!isPdf && !isImage) {
        rejected.push(file.name + ' (نوع غير مدعوم)');
        return;
      }
      if (file.size > 12 * 1024 * 1024) {
        rejected.push(file.name + ' (أكبر من 12MB)');
        return;
      }
      valid.push(file);
    });

    setSmartSourceFiles((current) => {
      const merged = [...current];
      valid.forEach((file) => {
        const duplicate = merged.some((item) => item.name === file.name && item.size === file.size && item.lastModified === file.lastModified);
        if (!duplicate && merged.length < 8) merged.push(file);
      });
      const totalSize = merged.reduce((sum, file) => sum + file.size, 0);
      if (totalSize > 40 * 1024 * 1024) {
        setSmartExtractionMessage('إجمالي ملفات القراءة تجاوز 40MB. احذف بعض الصفحات أو استخدم ملفات أصغر.');
        return current;
      }
      return merged;
    });
    setSmartExtraction(null);
    if (rejected.length) setSmartExtractionMessage('تم تجاهل: ' + rejected.join('، '));
    else setSmartExtractionMessage('تمت إضافة الصفحات. يمكنك إضافة صور/ملفات أخرى ثم بدء التحليل دفعة واحدة.');
  };

  const removeSmartSourceFile = (index: number) => {
    setSmartSourceFiles((current) => current.filter((_, fileIndex) => fileIndex !== index));
    setSmartExtraction(null);
    setSmartExtractionMessage('تم تحديث مجموعة الصفحات. اضغط «تحليل المستندات» لقراءة المجموعة الحالية.');
  };

  const clearSmartSourceFiles = () => {
    setSmartSourceFiles([]);
    setSmartExtraction(null);
    setSmartExtractionMessage('');
  };

  const handleSmartExtraction = async () => {
    if (!smartSourceFiles.length || smartExtracting) return;
    setSmartExtraction(null);
    setSmartExtractionMessage('جارٍ قراءة ' + smartSourceFiles.length.toLocaleString('ar-SA') + ' صفحة/ملف وربط البيانات بينها...');
    setSmartExtracting(true);
    try {
      const result = await extractAssetData(smartSourceFiles);
      setSmartExtraction(result);
      const found = Object.values(result.fields || {}).filter((value) => value !== null && value !== undefined && String(value).trim() !== '').length;
      setSmartExtractionMessage(found ? ('تم تحليل ' + smartSourceFiles.length.toLocaleString('ar-SA') + ' صفحة/ملف واستخراج ' + found.toLocaleString('ar-SA') + ' حقل. راجع النتائج ثم طبّقها على النموذج.') : 'تمت قراءة المستندات، لكن لم يتم العثور على بيانات أصل واضحة بما يكفي.');
    } catch (smartError: any) {
      setSmartExtractionMessage(String(smartError?.message || 'تعذر قراءة المستندات واستخراج البيانات.'));
    } finally {
      setSmartExtracting(false);
    }
  };`,
'multipage smart handlers');

page = replaceOnce(page,
`              <div className="flex flex-col gap-3 sm:flex-row">
                <Button type="button" onClick={() => smartCameraInputRef.current?.click()} disabled={smartExtracting} className="h-12 flex-1 rounded-2xl bg-slate-900 text-white hover:bg-slate-800">
                  {smartExtracting ? <Loader2 className="ml-2 h-4 w-4 animate-spin" /> : <Camera className="ml-2 h-4 w-4" />}
                  تصوير مباشر بالجوال
                </Button>
                <Button type="button" variant="outline" onClick={() => smartFileInputRef.current?.click()} disabled={smartExtracting} className="h-12 flex-1 rounded-2xl bg-white/90">
                  <Upload className="ml-2 h-4 w-4" />
                  رفع ملف
                </Button>
                <input ref={smartCameraInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={(event) => void handleSmartExtraction(event.target.files?.[0] || null)} />
                <input ref={smartFileInputRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif,.pdf,application/pdf" className="hidden" onChange={(event) => void handleSmartExtraction(event.target.files?.[0] || null)} />
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
                <span>JPG, PNG, WEBP, PDF حتى 12MB</span>
                <span className="h-1 w-1 rounded-full bg-slate-300" />
                <span>الملف يستخدم للتحليل فقط ولا يُحفظ كمرفق تلقائيًا</span>
              </div>

              {(smartSourceFile || smartExtractionMessage) && (
                <div className="mt-5 rounded-2xl border border-slate-200/80 bg-white/80 p-4 shadow-[0_8px_24px_rgba(15,23,42,0.04)]">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <div className="text-sm font-black">نتيجة القراءة (معاينة)</div>
                      {smartSourceFile && <div className="mt-1 max-w-[520px] truncate text-[11px] text-muted-foreground">{smartSourceFile.name} • {formatFileSize(smartSourceFile.size)}</div>}
                    </div>
                    {smartExtraction && (
                      <div className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-[11px] font-bold text-emerald-700">
                        <CheckCircle2 className="h-3.5 w-3.5" /> تم الاستخراج بنجاح
                      </div>
                    )}
                  </div>`,
`              <div className="flex flex-col gap-3 sm:flex-row">
                <Button type="button" onClick={() => smartCameraInputRef.current?.click()} disabled={smartExtracting || smartSourceFiles.length >= 8} className="h-12 flex-1 rounded-2xl bg-slate-900 text-white hover:bg-slate-800">
                  <Camera className="ml-2 h-4 w-4" />
                  تصوير صفحة بالجوال
                </Button>
                <Button type="button" variant="outline" onClick={() => smartFileInputRef.current?.click()} disabled={smartExtracting || smartSourceFiles.length >= 8} className="h-12 flex-1 rounded-2xl bg-white/90">
                  <Upload className="ml-2 h-4 w-4" />
                  رفع صور / ملفات
                </Button>
                <Button type="button" onClick={() => void handleSmartExtraction()} disabled={smartExtracting || !smartSourceFiles.length} className="h-12 flex-1 rounded-2xl bg-cyan-700 text-white hover:bg-cyan-800">
                  {smartExtracting ? <Loader2 className="ml-2 h-4 w-4 animate-spin" /> : <Sparkles className="ml-2 h-4 w-4" />}
                  تحليل المستندات {smartSourceFiles.length ? '(' + smartSourceFiles.length.toLocaleString('ar-SA') + ')' : ''}
                </Button>
                <input ref={smartCameraInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={(event) => { addSmartSourceFiles(event.target.files); event.currentTarget.value = ''; }} />
                <input ref={smartFileInputRef} type="file" multiple accept="image/jpeg,image/png,image/webp,image/gif,.pdf,application/pdf" className="hidden" onChange={(event) => { addSmartSourceFiles(event.target.files); event.currentTarget.value = ''; }} />
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
                <span>حتى 8 صفحات/ملفات • 12MB للملف • 40MB للمجموعة</span>
                <span className="h-1 w-1 rounded-full bg-slate-300" />
                <span>يمكن التصوير عدة مرات أو اختيار عدة ملفات دفعة واحدة</span>
                <span className="h-1 w-1 rounded-full bg-slate-300" />
                <span>تستخدم للتحليل فقط ولا تُحفظ كمرفقات تلقائيًا</span>
              </div>

              {smartSourceFiles.length > 0 && (
                <div className="mt-4 rounded-2xl border border-cyan-100 bg-cyan-50/45 p-3">
                  <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                    <div className="text-xs font-black text-slate-700">صفحات ومستندات القراءة <span className="mr-1 rounded-full bg-white px-2 py-0.5 text-cyan-700">{smartSourceFiles.length.toLocaleString('ar-SA')}</span></div>
                    <button type="button" onClick={clearSmartSourceFiles} disabled={smartExtracting} className="text-[11px] font-bold text-slate-500 hover:text-red-600">مسح الكل</button>
                  </div>
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    {smartSourceFiles.map((file, index) => (
                      <div key={file.name + file.size + file.lastModified} className="flex items-center gap-2 rounded-xl border border-white bg-white/90 px-3 py-2 shadow-sm">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-[11px] font-black text-slate-600">{(index + 1).toLocaleString('ar-SA')}</div>
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-xs font-bold text-slate-700" title={file.name}>{file.name}</div>
                          <div className="mt-0.5 text-[10px] text-muted-foreground">{formatFileSize(file.size)}</div>
                        </div>
                        <button type="button" onClick={() => removeSmartSourceFile(index)} disabled={smartExtracting} className="rounded-lg p-1.5 text-slate-400 transition hover:bg-red-50 hover:text-red-600" title="حذف هذه الصفحة"><X className="h-3.5 w-3.5" /></button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {(smartSourceFiles.length > 0 || smartExtractionMessage) && (
                <div className="mt-5 rounded-2xl border border-slate-200/80 bg-white/80 p-4 shadow-[0_8px_24px_rgba(15,23,42,0.04)]">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <div className="text-sm font-black">نتيجة القراءة المجمعة (معاينة)</div>
                      {smartSourceFiles.length > 0 && <div className="mt-1 text-[11px] text-muted-foreground">يتم دمج المعلومات من جميع الصفحات باعتبارها مستندات مرتبطة بنفس الأصل.</div>}
                    </div>
                    {smartExtraction && (
                      <div className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-[11px] font-bold text-emerald-700">
                        <CheckCircle2 className="h-3.5 w-3.5" /> تم الاستخراج بنجاح
                      </div>
                    )}
                  </div>`,
'multipage extraction UI');

page = replaceOnce(page,
`                      التقط صورة فاتورة أو ملصق أصل أو ارفع PDF، وسيحاول النظام قراءة البيانات وتحديد الحقول المناسبة تلقائيًا.`,
`                      التقط صفحة واحدة أو عدة صفحات، أو ارفع مجموعة صور وملفات PDF؛ وسيقرأ النظام المستندات معًا ويربط المعلومات بينها لتعبئة الحقول المناسبة تلقائيًا.`,
'multipage description');

fs.writeFileSync(pagePath, page);

const apiPath = 'src/app/api/assets.ts';
let api = fs.readFileSync(apiPath, 'utf8');
api = replaceOnce(api,
`  source?: { fileName?: string; mimeType?: string; size?: number };`,
`  source?: { fileName?: string; mimeType?: string; size?: number; files?: Array<{ fileName?: string; mimeType?: string; size?: number }> };`,
'source type');
api = replaceOnce(api,
`export const extractAssetData = async (file: File): Promise<AssetSmartExtraction> => {
  const body = new FormData();
  body.append('file', file);`,
`export const extractAssetData = async (files: File[]): Promise<AssetSmartExtraction> => {
  const body = new FormData();
  files.forEach((file) => body.append('files', file));`,
'multi file api');
fs.writeFileSync(apiPath, api);
console.log('Multipage asset extraction frontend applied.');
