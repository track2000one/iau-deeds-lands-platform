from pathlib import Path

path = Path('src/app/components/MosqueFieldVisitsPanel.tsx')
text = path.read_text(encoding='utf-8')

# 1) Add visit report column definitions.
if 'type VisitReportColumnKey =' not in text:
    anchor = """const followUpProgramReportColumns: ProgramReportColumnKey[] = [
  'visit_number', 'site', 'date', 'priority', 'open_items', 'urgent_items', 'overdue_items', 'workflow',
];

const splitMembers"""
    replacement = """const followUpProgramReportColumns: ProgramReportColumnKey[] = [
  'visit_number', 'site', 'date', 'priority', 'open_items', 'urgent_items', 'overdue_items', 'workflow',
];

type VisitReportColumnKey =
  | 'category'
  | 'title'
  | 'status'
  | 'priority'
  | 'note'
  | 'responsible'
  | 'due_date'
  | 'resolution'
  | 'resolution_note'
  | 'treatment_images';

const visitReportColumns: Array<{ key: VisitReportColumnKey; label: string; align?: 'right' }> = [
  { key: 'category', label: 'المحور' },
  { key: 'title', label: 'بند الفحص', align: 'right' },
  { key: 'status', label: 'النتيجة' },
  { key: 'priority', label: 'الأولوية' },
  { key: 'note', label: 'الملاحظة', align: 'right' },
  { key: 'responsible', label: 'الجهة المسؤولة', align: 'right' },
  { key: 'due_date', label: 'تاريخ الاستحقاق' },
  { key: 'resolution', label: 'حالة المعالجة' },
  { key: 'resolution_note', label: 'الإجراء / المعالجة المنفذة', align: 'right' },
  { key: 'treatment_images', label: 'صور قبل / بعد' },
];

const defaultVisitReportColumns: VisitReportColumnKey[] = [
  'category', 'title', 'status', 'priority', 'note', 'responsible', 'resolution', 'treatment_images',
];
const basicVisitReportColumns: VisitReportColumnKey[] = ['category', 'title', 'status', 'priority'];
const followUpVisitReportColumns: VisitReportColumnKey[] = [
  'category', 'title', 'priority', 'note', 'responsible', 'due_date', 'resolution', 'resolution_note', 'treatment_images',
];

const splitMembers"""
    if anchor not in text:
        raise SystemExit('visit report type anchor not found')
    text = text.replace(anchor, replacement, 1)

# 2) Add print configuration state.
state_anchor = """  const [includePrintImages, setIncludePrintImages] = React.useState(true);
  const [printTreatmentOnly, setPrintTreatmentOnly] = React.useState(false);
  const [preparingPrint, setPreparingPrint] = React.useState(false);"""
state_replacement = """  const [includePrintImages, setIncludePrintImages] = React.useState(true);
  const [printTreatmentOnly, setPrintTreatmentOnly] = React.useState(false);
  const [visitPrintTitle, setVisitPrintTitle] = React.useState('تقرير زيارة ميدانية');
  const [visitPrintIssueFilter, setVisitPrintIssueFilter] = React.useState('');
  const [visitPrintStatusFilter, setVisitPrintStatusFilter] = React.useState('');
  const [visitPrintPriorityFilter, setVisitPrintPriorityFilter] = React.useState('');
  const [visitPrintResolutionFilter, setVisitPrintResolutionFilter] = React.useState('');
  const [visitPrintCategoryFilter, setVisitPrintCategoryFilter] = React.useState('');
  const [visitPrintSortBy, setVisitPrintSortBy] = React.useState<'order' | 'category' | 'priority' | 'status' | 'resolution' | 'due_date'>('order');
  const [visitPrintSortDirection, setVisitPrintSortDirection] = React.useState<'asc' | 'desc'>('asc');
  const [visitPrintColumns, setVisitPrintColumns] = React.useState<VisitReportColumnKey[]>([...defaultVisitReportColumns]);
  const [preparingPrint, setPreparingPrint] = React.useState(false);"""
if 'const [visitPrintTitle, setVisitPrintTitle]' not in text:
    if state_anchor not in text:
        raise SystemExit('visit print state anchor not found')
    text = text.replace(state_anchor, state_replacement, 1)

# 3) Insert helpers before printVisit.
helper_marker = "  const printVisit = async (visit: MosqueFieldVisit, includeImages: boolean) => {"
if 'const getConfiguredVisitItems = (items: MosqueFieldVisitItem[])' not in text:
    helper = r'''  const resetVisitPrintOptions = (visit?: MosqueFieldVisit | null) => {
    setVisitPrintTitle(visit ? `تقرير زيارة ميدانية — ${visit.site.name}` : 'تقرير زيارة ميدانية');
    setVisitPrintIssueFilter('');
    setVisitPrintStatusFilter('');
    setVisitPrintPriorityFilter('');
    setVisitPrintResolutionFilter('');
    setVisitPrintCategoryFilter('');
    setVisitPrintSortBy('order');
    setVisitPrintSortDirection('asc');
    setVisitPrintColumns([...defaultVisitReportColumns]);
  };

  const getConfiguredVisitItems = (items: MosqueFieldVisitItem[]) => {
    const priorityOrder: Record<string, number> = { low: 1, normal: 2, medium: 3, high: 4, urgent: 5 };
    const resolutionOrder: Record<string, number> = { new: 1, referred: 2, in_progress: 3, resolved: 4, closed: 5 };
    const statusOrder: Record<string, number> = { not_checked: 1, needs_action: 2, not_available: 3, not_applicable: 4, good: 5 };
    const now = Date.now();
    const filtered = items.map((item, index) => ({ item, index })).filter(({ item }) => {
      const open = item.status === 'needs_action' && !['resolved', 'closed'].includes(item.resolutionStatus);
      const urgent = open && item.priority === 'urgent';
      const overdue = open && Boolean(item.dueDate) && new Date(String(item.dueDate)).getTime() < now;
      const resolved = item.status === 'needs_action' && ['resolved', 'closed'].includes(item.resolutionStatus);
      const issueMatches = !visitPrintIssueFilter
        || (visitPrintIssueFilter === 'open' && open)
        || (visitPrintIssueFilter === 'urgent' && urgent)
        || (visitPrintIssueFilter === 'overdue' && overdue)
        || (visitPrintIssueFilter === 'resolved' && resolved);
      return issueMatches
        && (!visitPrintStatusFilter || item.status === visitPrintStatusFilter)
        && (!visitPrintPriorityFilter || item.priority === visitPrintPriorityFilter)
        && (!visitPrintResolutionFilter || item.resolutionStatus === visitPrintResolutionFilter)
        && (!visitPrintCategoryFilter || item.category === visitPrintCategoryFilter);
    });

    const direction = visitPrintSortDirection === 'asc' ? 1 : -1;
    return filtered.sort((a, b) => {
      let comparison = a.index - b.index;
      if (visitPrintSortBy === 'category') comparison = String(a.item.category || '').localeCompare(String(b.item.category || ''), 'ar');
      else if (visitPrintSortBy === 'priority') comparison = (priorityOrder[a.item.priority] || 0) - (priorityOrder[b.item.priority] || 0);
      else if (visitPrintSortBy === 'status') comparison = (statusOrder[a.item.status] || 0) - (statusOrder[b.item.status] || 0);
      else if (visitPrintSortBy === 'resolution') comparison = (resolutionOrder[a.item.resolutionStatus] || 0) - (resolutionOrder[b.item.resolutionStatus] || 0);
      else if (visitPrintSortBy === 'due_date') comparison = (a.item.dueDate ? new Date(a.item.dueDate).getTime() : Number.MAX_SAFE_INTEGER) - (b.item.dueDate ? new Date(b.item.dueDate).getTime() : Number.MAX_SAFE_INTEGER);
      return comparison * direction;
    }).map(({ item }) => item);
  };

'''
    idx = text.find(helper_marker)
    if idx < 0:
        raise SystemExit('printVisit helper marker not found')
    text = text[:idx] + helper + text[idx:]

# 4) Replace printVisit function.
start = text.find("  const printVisit = async (visit: MosqueFieldVisit, includeImages: boolean) => {")
end = text.find("  const printTreatmentEvidenceReport = async", start)
if start < 0 or end < 0:
    raise SystemExit('printVisit block not found')
new_print_visit = r'''  const printVisit = async (visit: MosqueFieldVisit, includeImages: boolean) => {
    const report = window.open('', '_blank', 'width=1200,height=850');
    if (!report) {
      toast.error('تعذر فتح نافذة التقرير. اسمح بالنوافذ المنبثقة ثم حاول مجددًا.');
      return;
    }
    report.document.write('<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><title>جاري إعداد التقرير</title></head><body style="font-family:Tahoma,Arial;text-align:center;padding:80px"><h2>جاري إعداد تقرير الزيارة...</h2><p>يرجى الانتظار حتى يتم تحميل الصور المحددة.</p></body></html>');
    report.document.close();

    const reportTitle = visitPrintTitle.trim() || `تقرير زيارة ميدانية — ${visit.site.name}`;
    const selectedItems = getConfiguredVisitItems(visit.items || []);
    const selectedColumnDefs = visitReportColumns.filter((column) => visitPrintColumns.includes(column.key));
    const tableFontSize = selectedColumnDefs.length >= 9 ? 8 : selectedColumnDefs.length >= 7 ? 9 : 10;
    const isImageAttachment = (attachment: MosqueFieldVisitAttachment) => String(attachment.mimeType || '').startsWith('image/') || /\.(jpe?g|png|webp|gif)$/i.test(String(attachment.fileName || ''));
    const printImages = [
      ...(visit.attachments || []).filter(isImageAttachment).map((attachment, index) => ({ attachment, label: attachment.description || `مرفق الزيارة ${index + 1}` })),
      ...selectedItems.flatMap((item) => [
        ...(item.beforeImages || []).map((attachment) => ({ attachment, label: `قبل المعالجة — ${item.title}` })),
        ...(item.afterImages || []).map((attachment) => ({ attachment, label: `بعد المعالجة — ${item.title}` })),
      ]),
    ];
    const pdfAttachments = (visit.attachments || []).filter((attachment) => attachment.mimeType === 'application/pdf' || /\.pdf$/i.test(String(attachment.fileName || '')));
    const objectUrls: string[] = [];
    const printableImages = includeImages ? (await Promise.all(printImages.map(async ({ attachment, label }) => {
      try {
        if (!attachment.fileId) return { src: attachment.url, label };
        const blob = await mosqueApi.mediaBlob(attachment.fileId);
        const src = URL.createObjectURL(blob);
        objectUrls.push(src);
        return { src, label };
      } catch {
        return null;
      }
    }))).filter((item): item is { src: string; label: string } => Boolean(item)) : [];
    const imageSection = printableImages.length ? `<section class="attachments"><h2>الصور المرفقة (${printableImages.length})</h2><div class="image-grid">${printableImages.map((item, index) => `<figure><img src="${html(item.src)}" alt="${html(item.label)}"><figcaption><b>${index + 1}. ${html(item.label)}</b></figcaption></figure>`).join('')}</div></section>` : '';
    const pdfSection = pdfAttachments.length ? `<section class="pdf-list"><b>ملفات PDF المرفقة (${pdfAttachments.length})</b><div>${pdfAttachments.map((attachment, index) => `${index + 1}. ${html(attachment.description || `مرفق PDF ${index + 1}`)}`).join(' &nbsp; | &nbsp; ')}</div></section>` : '';
    const actionItems = selectedItems.filter((item) => item.status === 'needs_action');

    const cellValue = (item: MosqueFieldVisitItem, column: VisitReportColumnKey) => {
      switch (column) {
        case 'category': return item.category;
        case 'title': return item.title;
        case 'status': return getItemStatusLabel(item);
        case 'priority': return priorityLabels[item.priority] || item.priority;
        case 'note': return item.note || '-';
        case 'responsible': return item.responsibleEntity || '-';
        case 'due_date': return item.dueDate ? new Date(item.dueDate).toLocaleDateString('ar-SA-u-ca-gregory') : '-';
        case 'resolution': return resolutionLabels[item.resolutionStatus] || item.resolutionStatus;
        case 'resolution_note': return item.resolutionNote || '-';
        case 'treatment_images': return `${item.beforeImages?.length || 0}/${item.afterImages?.length || 0}`;
        default: return '-';
      }
    };
    const headerCells = selectedColumnDefs.map((column) => `<th>${html(column.label)}</th>`).join('');
    const rows = selectedItems.map((item, index) => {
      const cells = selectedColumnDefs.map((column) => `<td${column.align === 'right' ? ' class="right"' : ''}>${html(cellValue(item, column.key))}</td>`).join('');
      return `<tr><td>${index + 1}</td>${cells}</tr>`;
    }).join('');

    report.document.open();
    report.document.write(`<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><title>${html(reportTitle)}</title><style>@page{size:A4 landscape;margin:10mm}*{box-sizing:border-box;-webkit-print-color-adjust:exact;print-color-adjust:exact}body{font-family:Tahoma,Arial,sans-serif;color:#172033;margin:0}.head{border:2px solid #0f766e;border-radius:16px;padding:16px;background:#f0fdfa}.kicker{font-size:11px;color:#0f766e;font-weight:bold}.title{font-size:23px;font-weight:900;margin:6px 0}.subtitle{font-size:10px;color:#64748b}.meta{display:grid;grid-template-columns:repeat(4,1fr);gap:7px;margin-top:12px}.box{border:1px solid #cbd5e1;border-radius:10px;padding:8px;background:white}.box small{display:block;color:#64748b;margin-bottom:4px}.metrics{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin:12px 0}.metric{padding:10px;border:1px solid #cbd5e1;border-radius:10px;text-align:center}.metric b{display:block;font-size:20px;margin-top:4px}table{width:100%;border-collapse:collapse;font-size:${tableFontSize}px;table-layout:auto}th,td{border:1px solid #cbd5e1;padding:6px;text-align:center;vertical-align:top;word-break:break-word}th{background:#e2e8f0;white-space:nowrap}.right{text-align:right}.notes{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:12px}.note{border:1px solid #cbd5e1;border-radius:10px;padding:10px;min-height:65px;white-space:pre-wrap}.pdf-list{margin-top:12px;border:1px solid #cbd5e1;border-radius:10px;padding:10px;font-size:10px}.pdf-list div{margin-top:5px;color:#475569}.attachments{page-break-before:always;padding-top:3mm}.attachments h2{margin:0 0 12px;font-size:20px}.image-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:12px}.image-grid figure{margin:0;border:1px solid #cbd5e1;border-radius:12px;padding:8px;break-inside:avoid;page-break-inside:avoid}.image-grid img{display:block;width:100%;height:230px;object-fit:contain;background:#f8fafc;border-radius:8px}.image-grid figcaption{display:flex;flex-direction:column;gap:3px;margin-top:6px;font-size:10px}.footer{margin-top:10px;font-size:9px;color:#64748b;display:flex;justify-content:space-between}</style></head><body><div class="head"><div class="kicker">جامعة الإمام عبدالرحمن بن فيصل — وحدة العناية بالمساجد والمصليات الجامعية</div><div class="title">${html(reportTitle)}</div><div class="subtitle">يعرض التقرير ${selectedItems.length} من أصل ${visit.items.length} بند فحص وفق الفرز والتصفية المحددة.</div><div class="meta"><div class="box"><small>رقم الزيارة</small><b>${html(visit.visitNumber)}</b></div><div class="box"><small>المسجد / المصلى</small><b>${html(visit.site.name)}</b></div><div class="box"><small>التاريخ</small><b>${html(new Date(visit.visitDate).toLocaleString('ar-SA-u-ca-gregory'))}</b></div><div class="box"><small>نوع الزيارة</small><b>${html(visitTypeLabels[visit.visitType])}</b></div><div class="box"><small>الفريق</small><b>${html((visit.teamMembers || []).join('، '))}</b></div><div class="box"><small>ممثل الموقع</small><b>${html(visit.representativeName || '-')}</b></div><div class="box"><small>الحالة العامة</small><b>${html(overallLabels[visit.overallStatus])}</b></div><div class="box"><small>حالة السجل</small><b>${html(visitStatusLabels[visit.workflowStatus])}</b></div></div></div><div class="metrics"><div class="metric">بنود الفحص المطبوعة<b>${selectedItems.length}</b></div><div class="metric">تحتاج معالجة<b>${actionItems.length}</b></div><div class="metric">عاجلة<b>${actionItems.filter((item) => item.priority === 'urgent').length}</b></div><div class="metric">مغلقة بعد التحقق<b>${selectedItems.filter((item) => item.resolutionStatus === 'closed').length}</b></div></div><table><thead><tr><th>م</th>${headerCells}</tr></thead><tbody>${rows || `<tr><td colspan="${selectedColumnDefs.length + 1}">لا توجد بنود مطابقة للفرز والتصفية</td></tr>`}</tbody></table><div class="notes"><div class="note"><b>الملاحظات العامة</b><br>${html(visit.generalNotes || '-')}</div><div class="note"><b>التوصيات</b><br>${html(visit.recommendations || '-')}</div></div>${pdfSection}${imageSection}<div class="footer"><span>تم إنشاء التقرير من منصة IAU Deeds</span><span>${html(new Date().toLocaleString('ar-SA-u-ca-gregory'))}</span></div><script>window.onload=()=>setTimeout(()=>window.print(),500)<\/script></body></html>`);
    report.document.close();
    if (objectUrls.length) setTimeout(() => objectUrls.forEach((url) => URL.revokeObjectURL(url)), 10 * 60 * 1000);
  };

'''
text = text[:start] + new_print_visit + text[end:]

# 5) Make treatment report optionally follow visit print filters.
text = text.replace(
    "  const printTreatmentEvidenceReport = async (sourceVisits: MosqueFieldVisit[], reportTitle: string) => {",
    "  const printTreatmentEvidenceReport = async (sourceVisits: MosqueFieldVisit[], reportTitle: string, useVisitPrintFilters = false) => {",
    1,
)
old_treatment = """    const treatmentItems = sourceVisits.flatMap((visit) => (visit.items || [])
      .filter((item) => item.status === 'needs_action' || (item.beforeImages || []).length || (item.afterImages || []).length)
      .map((item) => ({ visit, item })));"""
new_treatment = """    const treatmentItems = sourceVisits.flatMap((visit) => (useVisitPrintFilters ? getConfiguredVisitItems(visit.items || []) : (visit.items || []))
      .filter((item) => item.status === 'needs_action' || (item.beforeImages || []).length || (item.afterImages || []).length)
      .map((item) => ({ visit, item })));"""
if old_treatment not in text:
    raise SystemExit('treatment item block not found')
text = text.replace(old_treatment, new_treatment, 1)

# 6) Replace request/confirm print behavior.
request_start = text.find("  const requestVisitPrint = (visit: MosqueFieldVisit) => {")
request_end = text.find("  const openProgramPrintDialog = () => {", request_start)
if request_start < 0 or request_end < 0:
    raise SystemExit('request/confirm print block not found')
new_request = r'''  const requestVisitPrint = (visit: MosqueFieldVisit) => {
    setPrintTarget(visit);
    setIncludePrintImages(true);
    setPrintTreatmentOnly(false);
    resetVisitPrintOptions(visit);
  };

  const confirmVisitPrint = async () => {
    if (!printTarget) return;
    const selectedItems = getConfiguredVisitItems(printTarget.items || []);
    const treatmentCount = selectedItems.filter((item) => item.status === 'needs_action' || (item.beforeImages || []).length || (item.afterImages || []).length).length;
    if ((!printTreatmentOnly && !selectedItems.length) || (printTreatmentOnly && !treatmentCount)) {
      toast.error(printTreatmentOnly ? 'لا توجد بنود معالجة مطابقة للفرز والتصفية المحددة' : 'لا توجد بنود فحص مطابقة للفرز والتصفية المحددة');
      return;
    }
    try {
      setPreparingPrint(true);
      if (printTreatmentOnly) await printTreatmentEvidenceReport([printTarget], visitPrintTitle.trim() || `تقرير المعالجة المصور — ${printTarget.site.name}`, true);
      else await printVisit(printTarget, includePrintImages);
      setPrintTarget(null);
    } finally {
      setPreparingPrint(false);
    }
  };

'''
text = text[:request_start] + new_request + text[request_end:]

# 7) Replace print counts with filtered counts.
count_start = text.find("  const printImageCount = printTarget ? [")
count_end = text.find("\n\n  if (loading) return", count_start)
if count_start < 0 or count_end < 0:
    raise SystemExit('print count block not found')
new_counts = r'''  const configuredPrintItems = printTarget ? getConfiguredVisitItems(printTarget.items || []) : [];
  const visitPrintCategories = printTarget ? Array.from(new Set((printTarget.items || []).map((item) => item.category).filter(Boolean))) : [];
  const printImageCount = printTarget ? [
    ...(printTarget.attachments || []).filter((attachment) => String(attachment.mimeType || '').startsWith('image/') || /\.(jpe?g|png|webp|gif)$/i.test(String(attachment.fileName || ''))),
    ...configuredPrintItems.flatMap((item) => [...(item.beforeImages || []), ...(item.afterImages || [])]),
  ].length : 0;
  const printPdfCount = printTarget ? (printTarget.attachments || []).filter((attachment) => attachment.mimeType === 'application/pdf' || /\.pdf$/i.test(String(attachment.fileName || ''))).length : 0;
  const printTreatmentCount = configuredPrintItems.filter((item) => item.status === 'needs_action' || (item.beforeImages || []).length || (item.afterImages || []).length).length;
'''
text = text[:count_start] + new_counts + text[count_end:]

# 8) Replace single-visit print dialog.
dialog_start = text.find("    <Dialog open={Boolean(printTarget)}")
dialog_end = text.find("\n    <Dialog open={tourDialog}", dialog_start)
if dialog_start < 0 or dialog_end < 0:
    raise SystemExit('single visit print dialog block not found')
new_dialog = r'''    <Dialog open={Boolean(printTarget)} onOpenChange={(open) => { if (!open && !preparingPrint) setPrintTarget(null); }}>
      <DialogContent className="max-h-[94vh] overflow-y-auto sm:max-w-[920px]" dir="rtl">
        {printTarget && <>
          <DialogHeader className="text-right">
            <DialogTitle className="flex items-center gap-2"><Printer className="h-5 w-5 text-sky-700" />خيارات طباعة التقرير</DialogTitle>
            <DialogDescription>اختر نوع التقرير ثم خصص عنوانه والبنود والفرز والأعمدة قبل الطباعة للزيارة {printTarget.visitNumber}.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid gap-3 md:grid-cols-3">
              <label className={`flex cursor-pointer items-start gap-3 rounded-2xl border-2 p-4 transition ${includePrintImages && !printTreatmentOnly ? 'border-sky-500 bg-sky-50' : 'border-slate-200 bg-white hover:border-sky-200'}`}>
                <input type="radio" name="visit-print-mode" className="mt-1 h-4 w-4 accent-sky-700" checked={includePrintImages && !printTreatmentOnly} onChange={() => { setIncludePrintImages(true); setPrintTreatmentOnly(false); }} />
                <Camera className="mt-0.5 h-5 w-5 shrink-0 text-sky-700" />
                <span><b className="block text-sm text-slate-800">تقرير كامل مع الصور</b><small className="mt-1 block text-slate-500">إدراج {printImageCount} صورة مرتبطة بالبُنود المحددة ومرفقات الزيارة.</small></span>
              </label>
              <label className={`flex cursor-pointer items-start gap-3 rounded-2xl border-2 p-4 transition ${!includePrintImages && !printTreatmentOnly ? 'border-slate-600 bg-slate-50' : 'border-slate-200 bg-white hover:border-slate-300'}`}>
                <input type="radio" name="visit-print-mode" className="mt-1 h-4 w-4 accent-slate-700" checked={!includePrintImages && !printTreatmentOnly} onChange={() => { setIncludePrintImages(false); setPrintTreatmentOnly(false); }} />
                <FileText className="mt-0.5 h-5 w-5 shrink-0 text-slate-700" />
                <span><b className="block text-sm text-slate-800">تقرير بدون الصور</b><small className="mt-1 block text-slate-500">طباعة البيانات والبنود المختارة فقط لتقليل عدد الصفحات.</small></span>
              </label>
              <label className={`flex cursor-pointer items-start gap-3 rounded-2xl border-2 p-4 transition ${printTreatmentOnly ? 'border-emerald-500 bg-emerald-50' : 'border-slate-200 bg-white hover:border-emerald-200'}`}>
                <input type="radio" name="visit-print-mode" className="mt-1 h-4 w-4 accent-emerald-700" checked={printTreatmentOnly} onChange={() => { setIncludePrintImages(true); setPrintTreatmentOnly(true); }} />
                <ImageIcon className="mt-0.5 h-5 w-5 shrink-0 text-emerald-700" />
                <span><b className="block text-sm text-slate-800">المعالجة المصورة قبل / بعد</b><small className="mt-1 block text-slate-500">تقرير مركز على {printTreatmentCount} بند معالجة مطابق للتصفية الحالية.</small></span>
              </label>
            </div>

            <Field label="عنوان التقرير">
              <Input value={visitPrintTitle} onChange={(event) => setVisitPrintTitle(event.target.value)} placeholder={`مثال: تقرير متابعة ${printTarget.site.name}`} />
            </Field>

            <div className="rounded-2xl border border-sky-100 bg-sky-50/50 p-3">
              <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
                <div><b className="text-sm text-slate-800">فرز وتصفية بنود الزيارة</b><p className="mt-1 text-[11px] text-slate-500">تطبق الخيارات على جدول الفحص، وعلى سجل المعالجة المصور عند اختياره.</p></div>
                <Badge variant="outline">{configuredPrintItems.length} من {printTarget.items.length} بند</Badge>
              </div>
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                <NativeSelect value={visitPrintIssueFilter} onChange={(event) => setVisitPrintIssueFilter(event.target.value)}>
                  <option value="">جميع البنود</option><option value="open">الملاحظات المفتوحة فقط</option><option value="urgent">العاجلة فقط</option><option value="overdue">المتأخرة فقط</option><option value="resolved">المعالَجة / المغلقة فقط</option>
                </NativeSelect>
                <NativeSelect value={visitPrintStatusFilter} onChange={(event) => setVisitPrintStatusFilter(event.target.value)}>
                  <option value="">جميع نتائج الفحص</option>{Object.entries(itemStatusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                </NativeSelect>
                <NativeSelect value={visitPrintCategoryFilter} onChange={(event) => setVisitPrintCategoryFilter(event.target.value)}>
                  <option value="">جميع المحاور</option>{visitPrintCategories.map((category) => <option key={category} value={category}>{category}</option>)}
                </NativeSelect>
                <NativeSelect value={visitPrintPriorityFilter} onChange={(event) => setVisitPrintPriorityFilter(event.target.value)}>
                  <option value="">جميع الأولويات</option>{Object.entries(priorityLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                </NativeSelect>
                <NativeSelect value={visitPrintResolutionFilter} onChange={(event) => setVisitPrintResolutionFilter(event.target.value)}>
                  <option value="">جميع حالات المعالجة</option>{Object.entries(resolutionLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                </NativeSelect>
                <NativeSelect value={visitPrintSortBy} onChange={(event) => setVisitPrintSortBy(event.target.value as typeof visitPrintSortBy)}>
                  <option value="order">ترتيب قائمة الفحص</option><option value="category">المحور</option><option value="priority">الأولوية</option><option value="status">نتيجة الفحص</option><option value="resolution">حالة المعالجة</option><option value="due_date">تاريخ الاستحقاق</option>
                </NativeSelect>
                <NativeSelect value={visitPrintSortDirection} onChange={(event) => setVisitPrintSortDirection(event.target.value as 'asc' | 'desc')}>
                  <option value="asc">تصاعدي / الترتيب الأصلي أولًا</option><option value="desc">تنازلي / الأعلى أو الأحدث أولًا</option>
                </NativeSelect>
              </div>
              <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-sky-100 pt-3">
                <span className="text-xs text-slate-600">{printTreatmentOnly ? `سيتم تضمين ${printTreatmentCount} بند معالجة مصور.` : `سيتم طباعة ${configuredPrintItems.length} بند فحص.`}</span>
                <Button type="button" size="sm" variant="outline" onClick={() => resetVisitPrintOptions(printTarget)}>إعادة ضبط التخصيص</Button>
              </div>
            </div>

            {!printTreatmentOnly && <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
              <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
                <div><b className="text-sm text-slate-800">الأعمدة الظاهرة في جدول الفحص</b><p className="mt-1 text-[11px] text-slate-500">اختر المعلومات التي تحتاجها فقط. عمود التسلسل «م» يظهر تلقائيًا.</p></div>
                <Badge variant="outline">{visitPrintColumns.length} عمود مختار</Badge>
              </div>
              <div className="mb-3 flex flex-wrap gap-2">
                <Button type="button" size="sm" variant="outline" onClick={() => setVisitPrintColumns([...defaultVisitReportColumns])}>الافتراضي</Button>
                <Button type="button" size="sm" variant="outline" onClick={() => setVisitPrintColumns([...basicVisitReportColumns])}>أساسي</Button>
                <Button type="button" size="sm" variant="outline" onClick={() => setVisitPrintColumns([...followUpVisitReportColumns])}>متابعة ومعالجة</Button>
                <Button type="button" size="sm" variant="outline" onClick={() => setVisitPrintColumns(visitReportColumns.map((column) => column.key))}>جميع الأعمدة</Button>
              </div>
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
                {visitReportColumns.map((column) => {
                  const selected = visitPrintColumns.includes(column.key);
                  return <button key={column.key} type="button" aria-pressed={selected} className={`flex min-h-10 items-center gap-2 rounded-xl border px-3 py-2 text-right text-xs font-semibold transition ${selected ? 'border-sky-300 bg-sky-50 text-sky-800 shadow-sm' : 'border-slate-200 bg-slate-50 text-slate-500 hover:bg-slate-100'}`} onClick={() => setVisitPrintColumns((current) => current.includes(column.key) ? (current.length === 1 ? current : current.filter((key) => key !== column.key)) : [...current, column.key])}><span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border text-[11px] ${selected ? 'border-sky-500 bg-sky-600 text-white' : 'border-slate-300 bg-white text-transparent'}`}>✓</span><span>{column.label}</span></button>;
                })}
              </div>
            </div>}

            {printTreatmentOnly && <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-800">في تقرير المعالجة المصور لا توجد أعمدة جدول ثابتة؛ تُطبق التصفية والفرز أعلاه على بطاقات الملاحظات وصور قبل/بعد المعالجة.</div>}
            {printPdfCount > 0 && <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">يوجد {printPdfCount} ملف PDF؛ ستظهر أوصافها في التقرير ويمكن فتح كل ملف وطباعته بصورة مستقلة.</div>}
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setPrintTarget(null)} disabled={preparingPrint}>إلغاء</Button>
            <Button className="bg-sky-700 text-white hover:bg-sky-800" onClick={() => void confirmVisitPrint()} disabled={preparingPrint || (!printTreatmentOnly && !configuredPrintItems.length) || (printTreatmentOnly && !printTreatmentCount)}>{preparingPrint ? <Loader2 className="ml-2 h-4 w-4 animate-spin" /> : <Printer className="ml-2 h-4 w-4" />}{preparingPrint ? 'جاري إعداد التقرير...' : 'متابعة إلى الطباعة'}</Button>
          </DialogFooter>
        </>}
      </DialogContent>
    </Dialog>
'''
text = text[:dialog_start] + new_dialog + text[dialog_end:]

path.write_text(text, encoding='utf-8')
print('Applied flexible single-visit print options')
