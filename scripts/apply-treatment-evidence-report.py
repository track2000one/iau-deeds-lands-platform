from pathlib import Path

path = Path('src/app/components/MosqueFieldVisitsPanel.tsx')
source = path.read_text(encoding='utf-8')


def replace_once(old: str, new: str, label: str):
    global source
    if old not in source:
        raise RuntimeError(f'{label} marker not found')
    source = source.replace(old, new, 1)

replace_once(
"""  const [printTarget, setPrintTarget] = React.useState<MosqueFieldVisit | null>(null);
  const [includePrintImages, setIncludePrintImages] = React.useState(true);
  const [preparingPrint, setPreparingPrint] = React.useState(false);""",
"""  const [printTarget, setPrintTarget] = React.useState<MosqueFieldVisit | null>(null);
  const [includePrintImages, setIncludePrintImages] = React.useState(true);
  const [printTreatmentOnly, setPrintTreatmentOnly] = React.useState(false);
  const [preparingPrint, setPreparingPrint] = React.useState(false);""",
'print state',
)

replace_once(
"""    const needsNote = visitForm.items.find((item) => item.status === 'needs_action' && !String(item.note || '').trim());
    if (needsNote) {
      toast.error(`اكتب وصف الملاحظة في بند: ${needsNote.title}`);
      return;
    }
    if (['completed', 'follow_up', 'closed'].includes(visitForm.workflowStatus) && visitForm.items.some((item) => item.status === 'not_checked')) {""",
"""    const needsNote = visitForm.items.find((item) => item.status === 'needs_action' && !String(item.note || '').trim());
    if (needsNote) {
      toast.error(`اكتب وصف الملاحظة في بند: ${needsNote.title}`);
      return;
    }
    const missingBeforeEvidence = ['completed', 'follow_up', 'closed'].includes(visitForm.workflowStatus)
      ? visitForm.items.find((item) => item.status === 'needs_action' && !(item.beforeImages || []).length)
      : null;
    if (missingBeforeEvidence) {
      toast.error(`أرفق صورة واحدة على الأقل قبل المعالجة في بند: ${missingBeforeEvidence.title}`);
      return;
    }
    const missingResolutionDescription = visitForm.items.find((item) =>
      item.status === 'needs_action'
      && ['resolved', 'closed'].includes(item.resolutionStatus)
      && !String(item.resolutionNote || '').trim()
    );
    if (missingResolutionDescription) {
      toast.error(`اكتب وصف الإجراء أو المعالجة المنفذة في بند: ${missingResolutionDescription.title}`);
      return;
    }
    const missingAfterEvidence = visitForm.items.find((item) =>
      item.status === 'needs_action'
      && item.resolutionStatus === 'closed'
      && !(item.afterImages || []).length
    );
    if (missingAfterEvidence) {
      toast.error(`لا يمكن إغلاق الملاحظة قبل إرفاق صورة بعد المعالجة في بند: ${missingAfterEvidence.title}`);
      return;
    }
    if (['completed', 'follow_up', 'closed'].includes(visitForm.workflowStatus) && visitForm.items.some((item) => item.status === 'not_checked')) {""",
'visit treatment validation',
)

marker = """  const requestVisitPrint = (visit: MosqueFieldVisit) => {
    setPrintTarget(visit);
    setIncludePrintImages(true);
  };
"""
helper = """  const printTreatmentEvidenceReport = async (sourceVisits: MosqueFieldVisit[], reportTitle: string) => {
    const report = window.open('', '_blank', 'width=1200,height=850');
    if (!report) {
      toast.error('تعذر فتح نافذة تقرير المعالجة. اسمح بالنوافذ المنبثقة ثم حاول مجددًا.');
      return;
    }

    const treatmentItems = sourceVisits.flatMap((visit) => (visit.items || [])
      .filter((item) => item.status === 'needs_action' || (item.beforeImages || []).length || (item.afterImages || []).length)
      .map((item) => ({ visit, item })));

    if (!treatmentItems.length) {
      report.close();
      toast.info('لا توجد ملاحظات أو صور معالجة قبل/بعد ضمن السجل المحدد');
      return;
    }

    report.document.write('<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><title>جاري إعداد سجل المعالجة المصور</title></head><body style="font-family:Tahoma,Arial;text-align:center;padding:80px"><h2>جاري إعداد سجل المعالجة المصور...</h2><p>يتم تحميل صور قبل المعالجة وبعدها.</p></body></html>');
    report.document.close();

    const objectUrls: string[] = [];
    const prepareImage = async (image: MosqueFieldVisitImage) => {
      try {
        if (!image.fileId) return { image, src: image.url };
        const blob = await mosqueApi.mediaBlob(image.fileId);
        const src = URL.createObjectURL(blob);
        objectUrls.push(src);
        return { image, src };
      } catch {
        return { image, src: image.url };
      }
    };

    const prepared = await Promise.all(treatmentItems.map(async ({ visit, item }) => ({
      visit,
      item,
      before: await Promise.all((item.beforeImages || []).map(prepareImage)),
      after: await Promise.all((item.afterImages || []).map(prepareImage)),
    })));

    const renderImages = (images: { image: MosqueFieldVisitImage; src: string }[], phase: 'before' | 'after') => {
      if (!images.length) return `<div class="empty-evidence">لم يتم إرفاق صورة ${phase === 'before' ? 'قبل المعالجة' : 'بعد المعالجة'}.</div>`;
      return `<div class="evidence-images">${images.map(({ image, src }, index) => `<figure><img src="${html(src)}" alt="${phase === 'before' ? 'قبل' : 'بعد'} ${index + 1}"><figcaption>${index + 1}${image.capturedAt ? ` — ${html(new Date(image.capturedAt).toLocaleString('ar-SA-u-ca-gregory'))}` : ''}</figcaption></figure>`).join('')}</div>`;
    };

    const cards = prepared.map(({ visit, item }, index) => {
      const before = prepared[index].before;
      const after = prepared[index].after;
      return `<section class="treatment-card"><div class="card-head"><div><span class="number">${index + 1}</span><b>${html(item.title)}</b><small>${html(item.category)}</small></div><div class="site"><b>${html(visit.site.name)}</b><small>${html(visit.visitNumber)} — ${html(new Date(visit.visitDate).toLocaleDateString('ar-SA-u-ca-gregory'))}</small></div></div><div class="details"><div><small>الملاحظة</small><b>${html(item.note || '-')}</b></div><div><small>الجهة المسؤولة</small><b>${html(item.responsibleEntity || '-')}</b></div><div><small>حالة المعالجة</small><b>${html(resolutionLabels[item.resolutionStatus] || item.resolutionStatus)}</b></div><div><small>وصف الإجراء / المعالجة المنفذة</small><b>${html(item.resolutionNote || '-')}</b></div></div><div class="compare"><div class="phase before"><h3>قبل المعالجة <span>${before.length}</span></h3>${renderImages(before, 'before')}</div><div class="phase after"><h3>بعد المعالجة <span>${after.length}</span></h3>${renderImages(after, 'after')}</div></div></section>`;
    }).join('');

    report.document.open();
    report.document.write(`<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><title>${html(reportTitle)}</title><style>@page{size:A4 landscape;margin:10mm}*{box-sizing:border-box;-webkit-print-color-adjust:exact;print-color-adjust:exact}body{font-family:Tahoma,Arial,sans-serif;color:#172033;margin:0;background:#fff}.head{border:2px solid #0f766e;border-radius:16px;padding:16px;background:#f0fdfa;margin-bottom:14px}.kicker{font-size:11px;color:#0f766e;font-weight:bold}.title{font-size:23px;font-weight:900;margin:6px 0}.summary{font-size:11px;color:#475569}.treatment-card{border:1px solid #cbd5e1;border-radius:16px;padding:12px;margin:0 0 14px;break-inside:avoid;page-break-inside:avoid}.card-head{display:flex;align-items:flex-start;justify-content:space-between;gap:16px;border-bottom:1px solid #e2e8f0;padding-bottom:8px}.card-head>div{display:flex;flex-wrap:wrap;align-items:center;gap:7px}.card-head small{color:#64748b}.number{display:inline-flex;width:24px;height:24px;border-radius:999px;align-items:center;justify-content:center;background:#0f766e;color:white;font-weight:bold}.site{justify-content:flex-end;text-align:left}.details{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin:10px 0}.details>div{border:1px solid #e2e8f0;border-radius:10px;padding:8px;background:#f8fafc}.details small{display:block;color:#64748b;margin-bottom:4px}.details b{font-size:10px}.compare{display:grid;grid-template-columns:1fr 1fr;gap:12px}.phase{border:1px solid #dbe4ee;border-radius:12px;padding:10px;min-height:190px}.phase h3{font-size:14px;margin:0 0 8px;display:flex;justify-content:space-between}.phase h3 span{border:1px solid #cbd5e1;border-radius:999px;padding:1px 7px;font-size:10px}.before{background:#fff7ed}.after{background:#f0fdf4}.evidence-images{display:grid;grid-template-columns:repeat(2,1fr);gap:8px}.evidence-images figure{margin:0;border:1px solid #cbd5e1;border-radius:10px;padding:6px;background:#fff;break-inside:avoid}.evidence-images img{width:100%;height:180px;display:block;object-fit:contain;background:#f8fafc;border-radius:7px}.evidence-images figcaption{font-size:9px;color:#64748b;margin-top:4px}.empty-evidence{height:180px;border:1px dashed #cbd5e1;border-radius:10px;display:flex;align-items:center;justify-content:center;color:#94a3b8;font-size:11px}.footer{display:flex;justify-content:space-between;margin-top:10px;font-size:9px;color:#64748b}</style></head><body><div class="head"><div class="kicker">جامعة الإمام عبدالرحمن بن فيصل — وحدة العناية بالمساجد والمصليات الجامعية</div><div class="title">${html(reportTitle)}</div><div class="summary">سجل معالجة مصور يوضح حالة الملاحظات قبل المعالجة وبعدها. عدد البنود: ${prepared.length}</div></div>${cards}<div class="footer"><span>منصة IAU Deeds — سجل المعالجة المصور</span><span>${html(new Date().toLocaleString('ar-SA-u-ca-gregory'))}</span></div><script>window.onload=()=>setTimeout(()=>window.print(),600)<\/script></body></html>`);
    report.document.close();
    if (objectUrls.length) setTimeout(() => objectUrls.forEach((url) => URL.revokeObjectURL(url)), 10 * 60 * 1000);
  };

  const printTourTreatmentReport = async (tour: MosqueFieldTour) => {
    const tourVisits = (tour.visits || [])
      .map((tourVisit) => visits.find((visit) => visit.id === tourVisit.id))
      .filter((visit): visit is MosqueFieldVisit => Boolean(visit));
    await printTreatmentEvidenceReport(tourVisits, `تقرير المعالجة المصور — ${tour.title}`);
  };

  const requestVisitPrint = (visit: MosqueFieldVisit) => {
    setPrintTarget(visit);
    setIncludePrintImages(true);
    setPrintTreatmentOnly(false);
  };
"""
replace_once(marker, helper, 'treatment report helper')

replace_once(
"""  const confirmVisitPrint = async () => {
    if (!printTarget) return;
    try {
      setPreparingPrint(true);
      await printVisit(printTarget, includePrintImages);
      setPrintTarget(null);""",
"""  const confirmVisitPrint = async () => {
    if (!printTarget) return;
    try {
      setPreparingPrint(true);
      if (printTreatmentOnly) await printTreatmentEvidenceReport([printTarget], `تقرير المعالجة المصور — ${printTarget.site.name}`);
      else await printVisit(printTarget, includePrintImages);
      setPrintTarget(null);""",
'confirm visit print',
)

replace_once(
"""  const printPdfCount = printTarget ? (printTarget.attachments || []).filter((attachment) => attachment.mimeType === 'application/pdf' || /\\.pdf$/i.test(String(attachment.fileName || ''))).length : 0;
""",
"""  const printPdfCount = printTarget ? (printTarget.attachments || []).filter((attachment) => attachment.mimeType === 'application/pdf' || /\\.pdf$/i.test(String(attachment.fileName || ''))).length : 0;
  const printTreatmentCount = printTarget ? (printTarget.items || []).filter((item) => item.status === 'needs_action' || (item.beforeImages || []).length || (item.afterImages || []).length).length : 0;
""",
'print treatment count',
)

replace_once(
"""            <DialogTitle className=\"flex items-center gap-2\"><Printer className=\"h-5 w-5 text-sky-700\" />خيارات طباعة التقرير</DialogTitle>
            <DialogDescription>اختر ما إذا كنت تريد إدراج الصور داخل تقرير الزيارة {printTarget.visitNumber}.</DialogDescription>""",
"""            <DialogTitle className=\"flex items-center gap-2\"><Printer className=\"h-5 w-5 text-sky-700\" />خيارات طباعة التقرير</DialogTitle>
            <DialogDescription>اختر نوع التقرير المناسب للزيارة {printTarget.visitNumber}، بما في ذلك سجل المعالجة المصور قبل/بعد.</DialogDescription>""",
'print dialog description',
)

replace_once(
"""            <label className={`flex cursor-pointer items-start gap-3 rounded-2xl border-2 p-4 transition ${includePrintImages ? 'border-sky-500 bg-sky-50' : 'border-slate-200 bg-white hover:border-sky-200'}`}>
              <input type=\"radio\" name=\"visit-print-images\" className=\"mt-1 h-4 w-4 accent-sky-700\" checked={includePrintImages} onChange={() => setIncludePrintImages(true)} />
              <Camera className=\"mt-0.5 h-5 w-5 shrink-0 text-sky-700\" />
              <span><b className=\"block text-sm text-slate-800\">طباعة التقرير مع الصور</b><small className=\"mt-1 block text-slate-500\">إدراج {printImageCount} صورة من مرفقات الزيارة وصور قبل/بعد المعالجة في صفحات مستقلة.</small></span>
            </label>
            <label className={`flex cursor-pointer items-start gap-3 rounded-2xl border-2 p-4 transition ${!includePrintImages ? 'border-slate-600 bg-slate-50' : 'border-slate-200 bg-white hover:border-slate-300'}`}>
              <input type=\"radio\" name=\"visit-print-images\" className=\"mt-1 h-4 w-4 accent-slate-700\" checked={!includePrintImages} onChange={() => setIncludePrintImages(false)} />
              <FileText className=\"mt-0.5 h-5 w-5 shrink-0 text-slate-700\" />
              <span><b className=\"block text-sm text-slate-800\">طباعة التقرير بدون الصور</b><small className=\"mt-1 block text-slate-500\">طباعة البيانات وقائمة الفحص والملاحظات فقط لتقليل عدد الصفحات.</small></span>
            </label>""",
"""            <label className={`flex cursor-pointer items-start gap-3 rounded-2xl border-2 p-4 transition ${includePrintImages && !printTreatmentOnly ? 'border-sky-500 bg-sky-50' : 'border-slate-200 bg-white hover:border-sky-200'}`}>
              <input type=\"radio\" name=\"visit-print-mode\" className=\"mt-1 h-4 w-4 accent-sky-700\" checked={includePrintImages && !printTreatmentOnly} onChange={() => { setIncludePrintImages(true); setPrintTreatmentOnly(false); }} />
              <Camera className=\"mt-0.5 h-5 w-5 shrink-0 text-sky-700\" />
              <span><b className=\"block text-sm text-slate-800\">تقرير الزيارة الكامل مع الصور</b><small className=\"mt-1 block text-slate-500\">إدراج {printImageCount} صورة من مرفقات الزيارة وصور قبل/بعد المعالجة.</small></span>
            </label>
            <label className={`flex cursor-pointer items-start gap-3 rounded-2xl border-2 p-4 transition ${!includePrintImages && !printTreatmentOnly ? 'border-slate-600 bg-slate-50' : 'border-slate-200 bg-white hover:border-slate-300'}`}>
              <input type=\"radio\" name=\"visit-print-mode\" className=\"mt-1 h-4 w-4 accent-slate-700\" checked={!includePrintImages && !printTreatmentOnly} onChange={() => { setIncludePrintImages(false); setPrintTreatmentOnly(false); }} />
              <FileText className=\"mt-0.5 h-5 w-5 shrink-0 text-slate-700\" />
              <span><b className=\"block text-sm text-slate-800\">تقرير الزيارة بدون الصور</b><small className=\"mt-1 block text-slate-500\">طباعة البيانات وقائمة الفحص والملاحظات فقط لتقليل عدد الصفحات.</small></span>
            </label>
            <label className={`flex cursor-pointer items-start gap-3 rounded-2xl border-2 p-4 transition ${printTreatmentOnly ? 'border-emerald-500 bg-emerald-50' : 'border-slate-200 bg-white hover:border-emerald-200'}`}>
              <input type=\"radio\" name=\"visit-print-mode\" className=\"mt-1 h-4 w-4 accent-emerald-700\" checked={printTreatmentOnly} onChange={() => { setIncludePrintImages(true); setPrintTreatmentOnly(true); }} />
              <ImageIcon className=\"mt-0.5 h-5 w-5 shrink-0 text-emerald-700\" />
              <span><b className=\"block text-sm text-slate-800\">سجل المعالجة المصور — قبل / بعد</b><small className=\"mt-1 block text-slate-500\">تقرير مركز على {printTreatmentCount} بند معالجة مع مقارنة صور قبل المعالجة وبعدها ووصف الإجراء المنفذ.</small></span>
            </label>""",
'print mode options',
)

replace_once(
"""<Field label=\"ملاحظة المعالجة\"><Input value={item.resolutionNote || ''} onChange={(event) => setVisitItem(index, { resolutionNote: event.target.value })} /></Field><ImageField label=\"صور قبل المعالجة\" images={item.beforeImages} loading={uploadingKey === `${index}-beforeImages`} onFiles={(files) => void uploadItemImages(index, 'beforeImages', files)} onRemove={(imageIndex) => removeItemImage(index, 'beforeImages', imageIndex)} /><ImageField label=\"صور بعد المعالجة\" images={item.afterImages} loading={uploadingKey === `${index}-afterImages`} onFiles={(files) => void uploadItemImages(index, 'afterImages', files)} onRemove={(imageIndex) => removeItemImage(index, 'afterImages', imageIndex)} />""",
"""<Field label={['resolved', 'closed'].includes(item.resolutionStatus) ? 'وصف الإجراء / المعالجة المنفذة *' : 'وصف الإجراء / المعالجة المنفذة'}><Textarea rows={2} value={item.resolutionNote || ''} onChange={(event) => setVisitItem(index, { resolutionNote: event.target.value })} placeholder=\"اكتب ما تم تنفيذه لمعالجة الملاحظة\" /></Field><div className=\"md:col-span-2 rounded-2xl border border-emerald-200 bg-white p-3\"><div className=\"mb-3 flex flex-wrap items-center justify-between gap-2\"><div><b className=\"text-sm text-emerald-900\">سجل المعالجة المصور — قبل / بعد</b><p className=\"mt-1 text-[11px] text-slate-500\">وثّق الحالة قبل المعالجة، ثم أضف صورة بعد التنفيذ لإغلاق الملاحظة والتحقق منها.</p></div><div className=\"flex gap-2\"><Badge variant=\"outline\">قبل: {(item.beforeImages || []).length}</Badge><Badge variant=\"outline\">بعد: {(item.afterImages || []).length}</Badge></div></div><div className=\"grid gap-3 md:grid-cols-2\"><ImageField label=\"صور قبل المعالجة *\" images={item.beforeImages} loading={uploadingKey === `${index}-beforeImages`} onFiles={(files) => void uploadItemImages(index, 'beforeImages', files)} onRemove={(imageIndex) => removeItemImage(index, 'beforeImages', imageIndex)} /><ImageField label={item.resolutionStatus === 'closed' ? 'صور بعد المعالجة *' : 'صور بعد المعالجة'} images={item.afterImages} loading={uploadingKey === `${index}-afterImages`} onFiles={(files) => void uploadItemImages(index, 'afterImages', files)} onRemove={(imageIndex) => removeItemImage(index, 'afterImages', imageIndex)} /></div></div>""",
'item treatment evidence ui',
)

replace_once(
"""{canEdit && <NativeSelect value={tour.status} onChange={(event) => void updateTourStatus(tour, event.target.value as MosqueFieldTour['status'])}>{Object.entries(tourStatusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</NativeSelect>}</CardContent>""",
"""{canEdit && <NativeSelect value={tour.status} onChange={(event) => void updateTourStatus(tour, event.target.value as MosqueFieldTour['status'])}>{Object.entries(tourStatusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</NativeSelect>}{canPrint && <Button size=\"sm\" variant=\"outline\" className=\"w-full border-emerald-200 text-emerald-800\" onClick={() => void printTourTreatmentReport(tour)}><ImageIcon className=\"ml-2 h-4 w-4\" />تقرير المعالجة المصور قبل / بعد</Button>}</CardContent>""",
'tour treatment report button',
)

path.write_text(source, encoding='utf-8')
print('Applied treatment evidence workflow and before/after reports.')
