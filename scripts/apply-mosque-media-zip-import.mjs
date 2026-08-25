import fs from 'node:fs';

const apiPath = 'src/app/api/mosques.ts';
let api = fs.readFileSync(apiPath, 'utf8');

const uploadClose = `    return body as { driveUrl: string; driveFileId?: string; fileName?: string; mimeType?: string };\n  },\n};`;
const uploadWithDelete = `    return body as { driveUrl: string; driveFileId?: string; fileName?: string; mimeType?: string };\n  },\n  deleteUpload: async (fileId: string) => {\n    const response = await authenticatedFetch(\`/api/uploads/\${encodeURIComponent(fileId)}\`, { method: 'DELETE', headers: { 'x-upload-module': 'mosques' } });\n    if (!response.ok && response.status !== 404) {\n      const body = await response.json().catch(() => ({}));\n      throw new Error(body?.message || 'تعذر حذف الملف المرفوع');\n    }\n  },\n};`;
if (!api.includes(uploadClose)) throw new Error('mosque API upload anchor not found');
api = api.replace(uploadClose, uploadWithDelete);
fs.writeFileSync(apiPath, api);

const pagePath = 'src/app/pages/MosquesUnitPage.tsx';
let page = fs.readFileSync(pagePath, 'utf8');

const reactOld = "import React, { useEffect, useMemo, useState } from 'react';";
const reactNew = "import React, { useEffect, useMemo, useRef, useState } from 'react';";
if (!page.includes(reactOld)) throw new Error('React import anchor not found');
page = page.replace(reactOld, reactNew);

const xlsxImport = "import * as XLSX from 'xlsx';";
if (!page.includes(xlsxImport)) throw new Error('XLSX import anchor not found');
page = page.replace(xlsxImport, `${xlsxImport}\nimport JSZip from 'jszip';`);

const exportAnchor = '\n\nexport const MosquesUnitPage: React.FC = () => {';
if (!page.includes(exportAnchor)) throw new Error('component export anchor not found');
const helpers = `

type MediaImportKind = 'site_image' | 'mosque_image' | 'document';
type MediaImportStatus = 'matched' | 'review' | 'manual' | 'unsupported';
type ZipMediaImportRow = {
  id: string;
  path: string;
  fileName: string;
  mimeType: string | null;
  kind: MediaImportKind;
  siteId: string;
  status: MediaImportStatus;
  selected: boolean;
  score: number;
  note: string;
};

const MEDIA_IMPORT_MIME: Record<string, string> = {
  jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp', gif: 'image/gif',
  pdf: 'application/pdf', doc: 'application/msword', docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  xls: 'application/vnd.ms-excel', xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  ppt: 'application/vnd.ms-powerpoint', pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  mp4: 'video/mp4',
};

const MEDIA_IMPORT_STOP_WORDS = new Set([
  'صور', 'صوره', 'تقرير', 'التقرير', 'الزياره', 'الميدانيه', 'نهائي', 'واتساب', 'whatsapp', 'image', 'video',
  'كلية', 'الكليه', 'مسجد', 'مصلى', 'جامع', 'الحرم', 'الجامعي', 'الجامعه', 'مبنى', 'الموقع', 'موقع', 'at', 'am', 'pm',
]);

const normalizeMediaImportText = (value: string) => String(value || '')
  .toLowerCase()
  .replace(/[أإآٱ]/g, 'ا')
  .replace(/[ؤ]/g, 'و')
  .replace(/[ئ]/g, 'ي')
  .replace(/[ى]/g, 'ي')
  .replace(/[ة]/g, 'ه')
  .replace(/[\u064B-\u065F\u0670]/g, '')
  .replace(/\b20\d{2}[-_. ]\d{1,2}[-_. ]\d{1,2}\b/g, ' ')
  .replace(/\b\d{1,2}[.:]\d{2}(?:[.:]\d{2})?\b/g, ' ')
  .replace(/([\u0600-\u06FFa-z])([0-9])/gi, '$1 $2')
  .replace(/([0-9])([\u0600-\u06FFa-z])/gi, '$1 $2')
  .replace(/\.[a-z0-9]{2,5}$/i, ' ')
  .replace(/[_\\/()\[\]{}.,،:;؛\-–—]+/g, ' ')
  .replace(/\s+/g, ' ')
  .trim();

const expandMediaImportText = (value: string) => {
  let text = value;
  const replacements: Array<[string, string]> = [
    ['متشفى', 'مستشفى'],
    ['اداره الاعمال', 'كليه اداره الاعمال'],
    ['الكليه الطبيه التطبيقيه', 'كليه العلوم الطبيه التطبيقيه'],
    ['كليه الجبيل الطبيه', 'كليه العلوم الطبيه التطبيقيه بالجبيل'],
    ['عماده السنه التحضيريه', 'السنه التحضيريه والدراسات المسانده'],
    ['مصلى الريان', 'حرم الريان'],
    ['مسجد سكن الطلاب', 'السكن الطلابي'],
    ['مسجد التصميم', 'التصاميم'],
    ['مسجد التصاميم', 'التصاميم'],
    ['التعليم الالكتروني والتعلم عن بعد', 'عماده التعليم الالكتروني والتعلم عن بعد'],
  ];
  for (const [from, to] of replacements) text = text.replaceAll(from, `${from} ${to}`);
  return text;
};

const mediaImportMimeForPath = (path: string) => {
  const extension = path.split('.').pop()?.toLowerCase() || '';
  return MEDIA_IMPORT_MIME[extension] || null;
};

const canonicalMediaFileName = (value: string) => normalizeMediaImportText(
  String(value || '').replace(/^\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}(?:-\d+)?Z-?/i, '')
);

const matchMediaImportSite = (path: string, sites: MosqueSite[]) => {
  const source = expandMediaImportText(normalizeMediaImportText(path));
  const sourceTokens = Array.from(new Set(source.split(' ').filter((token) => token.length > 1 && !MEDIA_IMPORT_STOP_WORDS.has(token))));
  if (!sourceTokens.length || !sites.length) return { siteId: '', score: 0, status: 'review' as MediaImportStatus, note: 'تعذر استخراج كلمات مطابقة كافية' };

  const scored = sites.map((site) => {
    const siteName = expandMediaImportText(normalizeMediaImportText(site.name));
    const haystack = expandMediaImportText(normalizeMediaImportText([site.name, site.district, site.campusLocation, site.city].filter(Boolean).join(' ')));
    let totalWeight = 0;
    let matchedWeight = 0;
    for (const token of sourceTokens) {
      const isCode = /^[am]\d+$/i.test(token) || /^\d{1,3}$/.test(token);
      const weight = isCode ? 3.2 : token.length >= 6 ? 2.2 : token.length >= 4 ? 1.6 : 1;
      totalWeight += weight;
      if (haystack.includes(token)) matchedWeight += weight;
    }
    let score = totalWeight ? matchedWeight / totalWeight : 0;
    if (siteName.length >= 3 && source.includes(siteName)) score += 0.5;
    const meaningfulSiteTokens = siteName.split(' ').filter((token) => token.length > 1 && !MEDIA_IMPORT_STOP_WORDS.has(token));
    if (meaningfulSiteTokens.length && meaningfulSiteTokens.every((token) => source.includes(token))) score += 0.25;
    return { site, score: Math.min(score, 1.5) };
  }).sort((a, b) => b.score - a.score);

  const top = scored[0];
  const second = scored[1];
  if (!top || top.score < 0.3) return { siteId: '', score: top?.score || 0, status: 'review' as MediaImportStatus, note: 'لا توجد مطابقة موثوقة؛ اختر الموقع يدويًا' };
  const margin = top.score - (second?.score || 0);
  if (top.score >= 0.68 && margin >= 0.12) {
    return { siteId: top.site.id, score: top.score, status: 'matched' as MediaImportStatus, note: `مطابقة تلقائية: ${top.site.name}` };
  }
  return { siteId: top.site.id, score: top.score, status: 'review' as MediaImportStatus, note: `مقترح يحتاج مراجعة: ${top.site.name}` };
};

const mediaImportSitePayload = (site: MosqueSite, images: MosqueSiteMediaLibrary) => ({
  name: site.name,
  siteType: site.siteType,
  city: site.city ?? null,
  district: site.district ?? null,
  campusLocation: site.campusLocation ?? null,
  area: site.area ?? null,
  capacity: site.capacity ?? null,
  latitude: site.latitude ?? null,
  longitude: site.longitude ?? null,
  mapUrl: site.mapUrl ?? null,
  status: site.status,
  imamName: site.imamName ?? null,
  muezzinName: site.muezzinName ?? null,
  khateebName: site.khateebName ?? null,
  contactPhone: site.contactPhone ?? null,
  notes: site.notes ?? null,
  images,
  supervisorUserId: site.supervisorUserId ?? null,
});`;
page = page.replace(exportAnchor, `${helpers}${exportAnchor}`);

const stateAnchor = "  const [siteMediaLibrary, setSiteMediaLibrary] = useState<MosqueSiteMediaLibrary>(emptySiteMedia());";
if (!page.includes(stateAnchor)) throw new Error('site media state anchor not found');
page = page.replace(stateAnchor, `${stateAnchor}\n  const [mediaImportDialog, setMediaImportDialog] = useState(false);\n  const [mediaImportRows, setMediaImportRows] = useState<ZipMediaImportRow[]>([]);\n  const [mediaImportParsing, setMediaImportParsing] = useState(false);\n  const [mediaImportSaving, setMediaImportSaving] = useState(false);\n  const [mediaImportProgress, setMediaImportProgress] = useState({ done: 0, total: 0, label: '' });\n  const mediaImportZipRef = useRef<JSZip | null>(null);`);

page = page.replace(
  "          fileName: uploaded.fileName || pending.file.name,",
  "          fileName: pending.file.name || uploaded.fileName || null,"
);

const reportAnchor = "  const exportReportExcel = async () => {";
if (!page.includes(reportAnchor)) throw new Error('report function anchor not found');
const importFunctions = `  const openMediaImportDialog = () => {
    setMediaImportRows([]);
    setMediaImportProgress({ done: 0, total: 0, label: '' });
    mediaImportZipRef.current = null;
    setMediaImportDialog(true);
  };

  const parseMediaImportZip = async (file: File | null) => {
    if (!file) return;
    if (!file.name.toLowerCase().endsWith('.zip')) return toast.error('اختر ملف ZIP صالحًا');
    setMediaImportParsing(true);
    setMediaImportRows([]);
    setMediaImportProgress({ done: 0, total: 0, label: 'جاري تحليل الملف...' });
    try {
      const zip = await JSZip.loadAsync(await file.arrayBuffer());
      mediaImportZipRef.current = zip;
      const entries = Object.values(zip.files).filter((entry) => !entry.dir && !entry.name.startsWith('__MACOSX/'));
      const rows: ZipMediaImportRow[] = entries.map((entry, index) => {
        const mimeType = mediaImportMimeForPath(entry.name);
        const fileName = entry.name.split('/').pop() || entry.name;
        if (!mimeType) {
          return { id: `zip-${index}`, path: entry.name, fileName, mimeType: null, kind: 'document', siteId: '', status: 'unsupported', selected: false, score: 0, note: 'نوع الملف غير مدعوم' };
        }
        const match = matchMediaImportSite(entry.name, sites);
        return {
          id: `zip-${index}`,
          path: entry.name,
          fileName,
          mimeType,
          kind: mimeType.startsWith('image/') ? 'mosque_image' : 'document',
          siteId: match.siteId,
          status: match.status,
          selected: match.status === 'matched',
          score: match.score,
          note: match.note,
        };
      });
      setMediaImportRows(rows);
      const matched = rows.filter((row) => row.status === 'matched').length;
      const review = rows.filter((row) => row.status === 'review').length;
      const unsupported = rows.filter((row) => row.status === 'unsupported').length;
      toast.success(`تم تحليل ${rows.length} ملفًا: ${matched} مطابق تلقائيًا، ${review} يحتاج مراجعة${unsupported ? `، ${unsupported} غير مدعوم` : ''}`);
    } catch (error) {
      mediaImportZipRef.current = null;
      toast.error(error instanceof Error ? error.message : 'تعذر قراءة ملف ZIP');
    } finally {
      setMediaImportParsing(false);
      setMediaImportProgress({ done: 0, total: 0, label: '' });
    }
  };

  const importSelectedMediaZip = async () => {
    const zip = mediaImportZipRef.current;
    if (!zip) return toast.error('اختر ملف ZIP أولًا');
    const selectedRows = mediaImportRows.filter((row) => row.selected && row.siteId && row.status !== 'unsupported');
    if (!selectedRows.length) return toast.error('حدد ملفًا واحدًا على الأقل وحدد الموقع المرتبط به');

    const grouped = new Map<string, ZipMediaImportRow[]>();
    for (const row of selectedRows) grouped.set(row.siteId, [...(grouped.get(row.siteId) || []), row]);

    setMediaImportSaving(true);
    setMediaImportProgress({ done: 0, total: selectedRows.length, label: 'بدء الاستيراد...' });
    let imported = 0;
    let skipped = 0;
    let done = 0;
    const failures: string[] = [];

    for (const [siteId, rows] of grouped.entries()) {
      const site = sites.find((item) => item.id === siteId);
      if (!site) {
        failures.push(`تعذر العثور على الموقع المرتبط بـ ${rows[0]?.fileName || 'ملف'}`);
        done += rows.length;
        continue;
      }
      const nextMedia = normalizeSiteMedia(site.images);
      const existingNames = new Set([
        ...nextMedia.photos.map((item) => canonicalMediaFileName(item.fileName || '')),
        ...nextMedia.documents.map((item) => canonicalMediaFileName(item.fileName || '')),
      ].filter(Boolean));
      const uploadedFileIds: string[] = [];
      let addedToSite = 0;

      try {
        for (const row of rows) {
          const canonicalName = canonicalMediaFileName(row.fileName);
          if (canonicalName && existingNames.has(canonicalName)) {
            skipped += 1;
            done += 1;
            setMediaImportProgress({ done, total: selectedRows.length, label: `تخطي ملف مكرر: ${row.fileName}` });
            continue;
          }
          const entry = zip.file(row.path);
          if (!entry) throw new Error(`تعذر قراءة ${row.fileName} من ملف ZIP`);
          setMediaImportProgress({ done, total: selectedRows.length, label: `رفع ${row.fileName} إلى ${site.name}` });
          const blob = await entry.async('blob');
          const file = new File([blob], row.fileName, { type: row.mimeType || blob.type || 'application/octet-stream' });
          const uploaded = await mosqueApi.upload(file);
          if (uploaded.driveFileId) uploadedFileIds.push(uploaded.driveFileId);
          const media = {
            url: uploaded.driveUrl,
            fileId: uploaded.driveFileId || null,
            fileName: row.fileName,
            mimeType: uploaded.mimeType || row.mimeType || null,
          };
          if (row.kind === 'document') nextMedia.documents.push(media);
          else nextMedia.photos.push({ ...media, category: row.kind });
          if (canonicalName) existingNames.add(canonicalName);
          imported += 1;
          addedToSite += 1;
          done += 1;
          setMediaImportProgress({ done, total: selectedRows.length, label: `تم رفع ${done} من ${selectedRows.length}` });
        }
        if (addedToSite > 0) await mosqueApi.updateSite(site.id, mediaImportSitePayload(site, nextMedia));
      } catch (error) {
        imported -= addedToSite;
        failures.push(`${site.name}: ${error instanceof Error ? error.message : 'تعذر إكمال الاستيراد'}`);
        for (const fileId of uploadedFileIds.reverse()) {
          try { await mosqueApi.deleteUpload(fileId); } catch { /* best-effort rollback */ }
        }
      }
    }

    try { await loadAll(); } catch { /* loadAll reports its own error */ }
    setMediaImportSaving(false);
    setMediaImportProgress({ done: selectedRows.length, total: selectedRows.length, label: failures.length ? 'اكتمل مع ملاحظات' : 'اكتمل الاستيراد' });

    if (failures.length) {
      toast.error(`تم استيراد ${imported} ملفًا${skipped ? ` وتخطي ${skipped} مكرر` : ''}. تعذر إكمال ${failures.length} مجموعة: ${failures.slice(0, 2).join(' | ')}`);
    } else {
      toast.success(`تم استيراد ${imported} ملفًا وربطها بالمواقع${skipped ? `، وتم تخطي ${skipped} ملفًا مكررًا` : ''}`);
      setMediaImportDialog(false);
      setMediaImportRows([]);
      mediaImportZipRef.current = null;
    }
  };

  const mediaImportStats = useMemo(() => ({
    total: mediaImportRows.length,
    matched: mediaImportRows.filter((row) => row.status === 'matched').length,
    review: mediaImportRows.filter((row) => row.status === 'review').length,
    manual: mediaImportRows.filter((row) => row.status === 'manual').length,
    unsupported: mediaImportRows.filter((row) => row.status === 'unsupported').length,
    selected: mediaImportRows.filter((row) => row.selected && row.siteId && row.status !== 'unsupported').length,
  }), [mediaImportRows]);

`;
page = page.replace(reportAnchor, `${importFunctions}${reportAnchor}`);

const addButton = `{canAdd && ['head', 'supervisor'].includes(role) && <Button className={\`${button3d} bg-sky-700 hover:bg-sky-800\`} onClick={() => openSiteDialog()}><Plus className="ml-2 h-4 w-4" />إضافة مسجد / مصلى</Button>}`;
if (!page.includes(addButton)) throw new Error('add site button anchor not found');
page = page.replace(addButton, `{canEdit && ['head', 'supervisor'].includes(role) && <Button variant="outline" className={button3d} onClick={openMediaImportDialog}><FileText className="ml-2 h-4 w-4" />استيراد مكتبة ZIP</Button>}\n            ${addButton}`);

page = page.replace(
  'يمكن رفع عدة صور للمسجد أو للموقع، إضافة إلى PDF وWord وExcel. الحد الأقصى 20 MB لكل ملف.',
  'يمكن رفع عدة صور للمسجد أو للموقع، إضافة إلى PDF وWord وExcel وPowerPoint وMP4. الحد الأقصى 20 MB لكل ملف.'
);
page = page.replace(
  'accept="image/*,application/pdf,.doc,.docx,.xls,.xlsx"',
  'accept="image/*,application/pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,video/mp4"'
);

const siteDialogAnchor = `      <Dialog open={siteDialog} onOpenChange={setSiteDialog}>`;
if (!page.includes(siteDialogAnchor)) throw new Error('site dialog anchor not found');
const importDialog = `      <Dialog open={mediaImportDialog} onOpenChange={(open) => { if (!mediaImportSaving) { setMediaImportDialog(open); if (!open) { setMediaImportRows([]); mediaImportZipRef.current = null; setMediaImportProgress({ done: 0, total: 0, label: '' }); } } }}>
        <DialogContent className="max-h-[94vh] overflow-hidden p-0 gap-0 border-sky-200/80 bg-gradient-to-br from-white via-sky-50/40 to-emerald-50/30 sm:max-w-[1220px]" dir="rtl">
          <DialogHeader className="border-b border-sky-100 bg-gradient-to-l from-sky-50 via-white to-emerald-50/60 p-5 text-right md:p-6">
            <DialogTitle className="flex items-center gap-2 text-xl font-black md:text-2xl"><FileText className="h-5 w-5 text-sky-700" />استيراد جماعي لمكتبة صور ومستندات المساجد</DialogTitle>
            <DialogDescription>اختر ملف ZIP؛ يتم تحليل أسماء المجلدات والملفات محليًا واقتراح المسجد أو المصلى المناسب قبل رفع أي ملف. الملفات غير الواضحة تبقى بحاجة للمراجعة ولا تُرفع تلقائيًا.</DialogDescription>
          </DialogHeader>
          <div className="max-h-[calc(94vh-160px)] space-y-4 overflow-y-auto p-4 md:p-6">
            <Card className="border-sky-200/70 bg-white/90">
              <CardHeader className="pb-3"><CardTitle className="text-base">1. اختيار ملف ZIP</CardTitle><CardDescription>يدعم الصور، PDF، Word، Excel، PowerPoint وMP4 حتى 20 MB لكل ملف داخلي.</CardDescription></CardHeader>
              <CardContent className="space-y-3">
                <Input type="file" accept=".zip,application/zip" disabled={mediaImportParsing || mediaImportSaving} onChange={(e) => { const file = e.target.files?.[0] || null; void parseMediaImportZip(file); e.currentTarget.value = ''; }} />
                <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-3 text-xs leading-6 text-emerald-900">مرحلة التحليل لا ترفع أي ملفات إلى الخادم. الرفع يبدأ فقط بعد مراجعة المطابقة والضغط على «استيراد الملفات المحددة».</div>
              </CardContent>
            </Card>

            {mediaImportRows.length > 0 && <>
              <div className="grid grid-cols-2 gap-3 md:grid-cols-6">
                <ReportMetric label="إجمالي الملفات" value={mediaImportStats.total} />
                <ReportMetric label="مطابقة تلقائية" value={mediaImportStats.matched} />
                <ReportMetric label="بحاجة للمراجعة" value={mediaImportStats.review} />
                <ReportMetric label="مطابقة يدوية" value={mediaImportStats.manual} />
                <ReportMetric label="غير مدعوم" value={mediaImportStats.unsupported} />
                <ReportMetric label="محدد للاستيراد" value={mediaImportStats.selected} />
              </div>

              <Card className="border-sky-200/70 bg-white/90">
                <CardHeader className="gap-3 md:flex-row md:items-center md:justify-between">
                  <div><CardTitle className="text-base">2. مراجعة المطابقة والتصنيف</CardTitle><CardDescription>يمكن تغيير الموقع المقترح أو تصنيف الصورة قبل الاستيراد.</CardDescription></div>
                  <div className="flex flex-wrap gap-2">
                    <Button type="button" size="sm" variant="outline" className={button3d} onClick={() => setMediaImportRows((rows) => rows.map((row) => row.status === 'matched' ? { ...row, selected: true } : row))}>تحديد المطابق تلقائيًا</Button>
                    <Button type="button" size="sm" variant="outline" className={button3d} onClick={() => setMediaImportRows((rows) => rows.map((row) => row.status === 'review' && row.siteId ? { ...row, selected: true } : row))}>اعتماد كل المقترحات</Button>
                    <Button type="button" size="sm" variant="outline" className={button3d} onClick={() => setMediaImportRows((rows) => rows.map((row) => ({ ...row, selected: false })))}>إلغاء التحديد</Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2">
                  {mediaImportRows.map((row) => {
                    const folder = row.path.split('/').slice(-2, -1)[0] || '-';
                    const imageFile = Boolean(row.mimeType?.startsWith('image/'));
                    return <div key={row.id} className={`grid gap-3 rounded-2xl border p-3 lg:grid-cols-[34px_minmax(230px,1.4fr)_minmax(230px,1fr)_190px_140px] ${row.selected ? 'border-emerald-300 bg-emerald-50/40' : 'bg-white'}`}>
                      <div className="flex items-center justify-center"><input type="checkbox" className="h-4 w-4" disabled={row.status === 'unsupported' || !row.siteId || mediaImportSaving} checked={row.selected} onChange={(e) => setMediaImportRows((rows) => rows.map((item) => item.id === row.id ? { ...item, selected: e.target.checked } : item))} /></div>
                      <div className="min-w-0"><p className="truncate text-sm font-bold text-slate-800">{row.fileName}</p><p className="mt-1 truncate text-xs text-muted-foreground">{folder}</p><p className="mt-1 line-clamp-1 text-[11px] text-slate-500">{row.note}</p></div>
                      <NativeSelect value={row.siteId} disabled={row.status === 'unsupported' || mediaImportSaving} onChange={(e) => setMediaImportRows((rows) => rows.map((item) => item.id === row.id ? { ...item, siteId: e.target.value, status: e.target.value ? 'manual' : 'review', selected: Boolean(e.target.value) } : item))}><option value="">اختر المسجد / المصلى</option>{sites.map((site) => <option key={site.id} value={site.id}>{site.name} — {site.campusLocation || site.district || ''}</option>)}</NativeSelect>
                      <NativeSelect value={row.kind} disabled={row.status === 'unsupported' || mediaImportSaving} onChange={(e) => setMediaImportRows((rows) => rows.map((item) => item.id === row.id ? { ...item, kind: e.target.value as MediaImportKind } : item))}>{imageFile && <option value="mosque_image">صورة المسجد / المصلى</option>}{imageFile && <option value="site_image">صورة الموقع / المبنى</option>}<option value="document">مستند / ملف</option></NativeSelect>
                      <div className="flex items-center justify-end"><Badge variant="outline" className={row.status === 'matched' ? 'border-emerald-300 bg-emerald-50 text-emerald-700' : row.status === 'manual' ? 'border-sky-300 bg-sky-50 text-sky-700' : row.status === 'unsupported' ? 'border-red-300 bg-red-50 text-red-700' : 'border-amber-300 bg-amber-50 text-amber-700'}>{row.status === 'matched' ? 'مطابق تلقائيًا' : row.status === 'manual' ? 'اختيار يدوي' : row.status === 'unsupported' ? 'غير مدعوم' : 'راجع المطابقة'}</Badge></div>
                    </div>;
                  })}
                </CardContent>
              </Card>
            </>}

            {(mediaImportParsing || mediaImportSaving || mediaImportProgress.label) && <div className="rounded-2xl border border-sky-200 bg-sky-50/70 p-4 text-sm text-sky-900"><div className="flex items-center gap-2"><RefreshCw className={`h-4 w-4 ${mediaImportParsing || mediaImportSaving ? 'animate-spin' : ''}`} /><strong>{mediaImportProgress.label || (mediaImportParsing ? 'جاري تحليل الملف...' : 'جاري الاستيراد...')}</strong></div>{mediaImportProgress.total > 0 && <p className="mt-2 text-xs">{mediaImportProgress.done} من {mediaImportProgress.total}</p>}</div>}
          </div>
          <DialogFooter className="border-t border-sky-100 bg-white/95 p-4 md:px-6"><Button variant="outline" className={button3d} disabled={mediaImportSaving} onClick={() => setMediaImportDialog(false)}>إلغاء</Button><Button className={'min-w-44 ' + button3d} disabled={mediaImportSaving || mediaImportStats.selected === 0} onClick={importSelectedMediaZip}>{mediaImportSaving ? <RefreshCw className="ml-2 h-4 w-4 animate-spin" /> : <Save className="ml-2 h-4 w-4" />}{mediaImportSaving ? 'جاري الاستيراد...' : `استيراد الملفات المحددة (${mediaImportStats.selected})`}</Button></DialogFooter>
        </DialogContent>
      </Dialog>

`;
page = page.replace(siteDialogAnchor, `${importDialog}${siteDialogAnchor}`);

const previewAnchor = `            {previewSite.notes && <div className="rounded-2xl border bg-slate-50 p-4"><p className="text-xs text-muted-foreground">ملاحظات</p><p className="mt-2 whitespace-pre-wrap text-sm leading-7 text-slate-700">{previewSite.notes}</p></div>}\n            {previewSite.latitude != null && previewSite.longitude != null && <div className="flex justify-end"><Button variant="outline" className={button3d} onClick={() => window.open(\`https://www.google.com/maps?q=\${previewSite.latitude},\${previewSite.longitude}\`, '_blank')}><MapPin className="ml-2 h-4 w-4" />فتح الموقع على الخريطة</Button></div>}`;
if (!page.includes(previewAnchor)) throw new Error('preview media anchor not found');
const previewWithMedia = `            {previewSite.notes && <div className="rounded-2xl border bg-slate-50 p-4"><p className="text-xs text-muted-foreground">ملاحظات</p><p className="mt-2 whitespace-pre-wrap text-sm leading-7 text-slate-700">{previewSite.notes}</p></div>}\n            {(() => { const media = normalizeSiteMedia(previewSite.images); return media.photos.length || media.documents.length ? <div className="space-y-4 rounded-2xl border bg-white p-4"><div className="flex items-center justify-between"><p className="font-black text-slate-800">الصور والمرفقات</p><Badge variant="outline">{media.photos.length + media.documents.length} ملف</Badge></div>{media.photos.length > 0 && <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">{media.photos.map((item, index) => <a key={\`preview-photo-\${index}\`} href={item.url} target="_blank" rel="noreferrer" className="overflow-hidden rounded-xl border bg-slate-50"><img src={drivePreviewUrl(item.url)} alt={item.fileName || 'صورة الموقع'} className="h-32 w-full object-cover" /><div className="flex items-center justify-between gap-2 p-2"><span className="min-w-0 truncate text-xs font-semibold text-slate-700">{item.fileName || \`صورة \${index + 1}\`}</span><Badge variant="outline" className="shrink-0 text-[10px]">{item.category === 'site_image' ? 'الموقع' : 'المسجد'}</Badge></div></a>)}</div>}{media.documents.length > 0 && <div className="space-y-2">{media.documents.map((item, index) => <a key={\`preview-doc-\${index}\`} href={item.url} target="_blank" rel="noreferrer" className="flex items-center justify-between gap-3 rounded-xl border bg-slate-50 p-3 text-sm hover:bg-sky-50"><span className="min-w-0 truncate font-semibold text-slate-700"><FileText className="ml-2 inline h-4 w-4 text-sky-700" />{item.fileName || \`مستند \${index + 1}\`}</span><ExternalLink className="h-4 w-4 shrink-0 text-sky-700" /></a>)}</div>}</div> : null; })()}\n            {previewSite.latitude != null && previewSite.longitude != null && <div className="flex justify-end"><Button variant="outline" className={button3d} onClick={() => window.open(\`https://www.google.com/maps?q=\${previewSite.latitude},\${previewSite.longitude}\`, '_blank')}><MapPin className="ml-2 h-4 w-4" />فتح الموقع على الخريطة</Button></div>}`;
page = page.replace(previewAnchor, previewWithMedia);
page = page.replace('className="sm:max-w-[720px]">\n          <DialogHeader className="text-right">\n            <DialogTitle className="flex items-center gap-2 text-xl font-black"><Eye className="h-5 w-5 text-sky-700" />معاينة — {previewSite?.name}</DialogTitle>', 'className="max-h-[90vh] overflow-y-auto sm:max-w-[900px]">\n          <DialogHeader className="text-right">\n            <DialogTitle className="flex items-center gap-2 text-xl font-black"><Eye className="h-5 w-5 text-sky-700" />معاينة — {previewSite?.name}</DialogTitle>');

fs.writeFileSync(pagePath, page);
console.log('Applied mosque ZIP media importer, preview gallery, and upload rollback support.');
