from pathlib import Path

path = Path('src/app/components/MosqueFieldVisitsPanel.tsx')
text = path.read_text(encoding='utf-8')

if 'type ProgramReportColumnKey =' not in text:
    anchor = """const resolutionLabels: Record<string, string> = {\n  new: 'جديدة',\n  referred: 'محالة',\n  in_progress: 'قيد المعالجة',\n  resolved: 'تمت المعالجة',\n  closed: 'مغلقة بعد التحقق',\n};\n\nconst splitMembers"""
    replacement = """const resolutionLabels: Record<string, string> = {\n  new: 'جديدة',\n  referred: 'محالة',\n  in_progress: 'قيد المعالجة',\n  resolved: 'تمت المعالجة',\n  closed: 'مغلقة بعد التحقق',\n};\n\ntype ProgramReportColumnKey =\n  | 'visit_number'\n  | 'site'\n  | 'visit_type'\n  | 'date'\n  | 'tour'\n  | 'location'\n  | 'overall'\n  | 'priority'\n  | 'open_items'\n  | 'urgent_items'\n  | 'overdue_items'\n  | 'workflow'\n  | 'team'\n  | 'representative'\n  | 'attachments'\n  | 'treatment_images';\n\nconst programReportColumns: Array<{ key: ProgramReportColumnKey; label: string; align?: 'right' }> = [\n  { key: 'visit_number', label: 'رقم الزيارة' },\n  { key: 'site', label: 'المسجد / المصلى', align: 'right' },\n  { key: 'visit_type', label: 'نوع الزيارة' },\n  { key: 'date', label: 'التاريخ' },\n  { key: 'tour', label: 'الجولة', align: 'right' },\n  { key: 'location', label: 'الموقع', align: 'right' },\n  { key: 'overall', label: 'الحالة العامة' },\n  { key: 'priority', label: 'الأولوية' },\n  { key: 'open_items', label: 'ملاحظات مفتوحة' },\n  { key: 'urgent_items', label: 'عاجلة' },\n  { key: 'overdue_items', label: 'متأخرة' },\n  { key: 'workflow', label: 'حالة الزيارة' },\n  { key: 'team', label: 'فريق الزيارة', align: 'right' },\n  { key: 'representative', label: 'ممثل الموقع', align: 'right' },\n  { key: 'attachments', label: 'المرفقات' },\n  { key: 'treatment_images', label: 'صور قبل / بعد' },\n];\n\nconst defaultProgramReportColumns: ProgramReportColumnKey[] = [\n  'visit_number', 'site', 'visit_type', 'date', 'overall', 'open_items', 'urgent_items', 'workflow',\n];\nconst basicProgramReportColumns: ProgramReportColumnKey[] = [\n  'visit_number', 'site', 'visit_type', 'date', 'overall', 'workflow',\n];\nconst followUpProgramReportColumns: ProgramReportColumnKey[] = [\n  'visit_number', 'site', 'date', 'priority', 'open_items', 'urgent_items', 'overdue_items', 'workflow',\n];\n\nconst splitMembers"""
    if anchor not in text:
        raise SystemExit('Could not find resolutionLabels anchor')
    text = text.replace(anchor, replacement, 1)

state_anchor = "  const [programReportTitle, setProgramReportTitle] = React.useState('تقرير البرنامج الميداني للمساجد والمصليات');\n"
state_replacement = state_anchor + "  const [programPrintColumns, setProgramPrintColumns] = React.useState<ProgramReportColumnKey[]>([...defaultProgramReportColumns]);\n"
if 'const [programPrintColumns, setProgramPrintColumns]' not in text:
    if state_anchor not in text:
        raise SystemExit('Could not find programReportTitle state anchor')
    text = text.replace(state_anchor, state_replacement, 1)

start_marker = '  const printProgramReport = () => {'
end_marker = '  const printTreatmentEvidenceReport = async'
start = text.find(start_marker)
end = text.find(end_marker, start)
if start < 0 or end < 0:
    raise SystemExit('Could not locate printProgramReport function')

new_function = r'''  const printProgramReport = () => {
    const reportTitle = programReportTitle.trim() || 'تقرير البرنامج الميداني للمساجد والمصليات';
    const openCount = (visit: MosqueFieldVisit) => visit.items.filter((item) => item.status === 'needs_action' && !['resolved', 'closed'].includes(item.resolutionStatus)).length;
    const urgentCount = (visit: MosqueFieldVisit) => visit.items.filter((item) => item.priority === 'urgent' && item.status === 'needs_action' && !['resolved', 'closed'].includes(item.resolutionStatus)).length;
    const overdueCount = (visit: MosqueFieldVisit) => visit.items.filter((item) => item.status === 'needs_action' && item.dueDate && new Date(item.dueDate).getTime() < Date.now() && !['resolved', 'closed'].includes(item.resolutionStatus)).length;
    const reportOpenItems = filteredVisits.reduce((total, visit) => total + openCount(visit), 0);
    const reportUrgentItems = filteredVisits.reduce((total, visit) => total + urgentCount(visit), 0);
    const reportOverdueItems = filteredVisits.reduce((total, visit) => total + overdueCount(visit), 0);
    const reportSiteCount = new Set(filteredVisits.map((visit) => visit.siteId)).size;
    const reportCompleted = filteredVisits.filter((visit) => ['completed', 'closed'].includes(visit.workflowStatus)).length;
    const activeColumnKeys = programPrintColumns.length ? programPrintColumns : defaultProgramReportColumns;
    const selectedColumnDefs = programReportColumns.filter((column) => activeColumnKeys.includes(column.key));
    const tableFontSize = selectedColumnDefs.length >= 13 ? 7.5 : selectedColumnDefs.length >= 10 ? 8.5 : 10;

    const cellValue = (visit: MosqueFieldVisit, column: ProgramReportColumnKey) => {
      switch (column) {
        case 'visit_number': return visit.visitNumber;
        case 'site': return visit.site.name;
        case 'visit_type': return visitTypeLabels[visit.visitType] || visit.visitType;
        case 'date': return new Date(visit.visitDate).toLocaleDateString('ar-SA-u-ca-gregory');
        case 'tour': return visit.tour ? [visit.tour.tourNumber, visit.tour.title].filter(Boolean).join(' — ') : '-';
        case 'location': return [visit.site.campusLocation, visit.site.district, visit.site.city].filter(Boolean).join(' — ') || '-';
        case 'overall': return overallLabels[visit.overallStatus] || visit.overallStatus;
        case 'priority': return priorityLabels[visit.priority] || visit.priority;
        case 'open_items': return openCount(visit);
        case 'urgent_items': return urgentCount(visit);
        case 'overdue_items': return overdueCount(visit);
        case 'workflow': return visitStatusLabels[visit.workflowStatus] || visit.workflowStatus;
        case 'team': return (visit.teamMembers || []).join('، ') || '-';
        case 'representative': return visit.representativeName || '-';
        case 'attachments': return visit.attachments?.length || 0;
        case 'treatment_images': {
          const before = visit.items.reduce((total, item) => total + (item.beforeImages?.length || 0), 0);
          const after = visit.items.reduce((total, item) => total + (item.afterImages?.length || 0), 0);
          return `${before}/${after}`;
        }
        default: return '-';
      }
    };

    const headerCells = selectedColumnDefs.map((column) => `<th>${html(column.label)}</th>`).join('');
    const rows = filteredVisits.map((visit, index) => {
      const cells = selectedColumnDefs.map((column) => `<td${column.align === 'right' ? ' class="right"' : ''}>${html(cellValue(visit, column.key))}</td>`).join('');
      return `<tr><td>${index + 1}</td>${cells}</tr>`;
    }).join('');
    const report = window.open('', '_blank', 'width=1200,height=850');
    if (!report) return toast.error('تعذر فتح نافذة التقرير. اسمح بالنوافذ المنبثقة ثم حاول مجددًا.');
    report.document.write(`<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><title>${html(reportTitle)}</title><style>@page{size:A4 landscape;margin:10mm}*{box-sizing:border-box;-webkit-print-color-adjust:exact;print-color-adjust:exact}body{font-family:Tahoma,Arial,sans-serif;color:#172033;margin:0}.head{border:2px solid #0369a1;border-radius:16px;padding:16px;background:linear-gradient(135deg,#f0f9ff,#fff,#ecfdf5)}.kicker{font-size:11px;color:#0369a1;font-weight:bold}h1{font-size:24px;margin:6px 0}.subtitle{font-size:11px;color:#475569}.metrics{display:grid;grid-template-columns:repeat(6,1fr);gap:8px;margin:14px 0}.metric{border:1px solid #cbd5e1;border-radius:10px;padding:10px;text-align:center;background:#fff}.metric small{display:block;color:#64748b}.metric b{display:block;font-size:22px;margin-top:4px}table{width:100%;border-collapse:collapse;font-size:${tableFontSize}px;table-layout:auto}th,td{border:1px solid #cbd5e1;padding:6px;text-align:center;vertical-align:middle;word-break:break-word}th{background:#e2e8f0;white-space:nowrap}.right{text-align:right}.footer{display:flex;justify-content:space-between;margin-top:12px;font-size:9px;color:#64748b}</style></head><body><div class="head"><div class="kicker">جامعة الإمام عبدالرحمن بن فيصل — وحدة العناية بالمساجد والمصليات الجامعية</div><h1>${html(reportTitle)}</h1><div class="subtitle">تم إنشاء التقرير من ${filteredVisits.length} زيارة وفق الفرز والتصفية الحالية${activeFilterCount ? ` (${activeFilterCount} معيار تصفية)` : ''}. الأعمدة المختارة: ${selectedColumnDefs.length} بالإضافة إلى عمود التسلسل.</div></div><div class="metrics"><div class="metric"><small>الزيارات في التقرير</small><b>${filteredVisits.length}</b></div><div class="metric"><small>المواقع</small><b>${reportSiteCount}</b></div><div class="metric"><small>المكتملة / المغلقة</small><b>${reportCompleted}</b></div><div class="metric"><small>الملاحظات المفتوحة</small><b>${reportOpenItems}</b></div><div class="metric"><small>العاجلة</small><b>${reportUrgentItems}</b></div><div class="metric"><small>المتأخرة</small><b>${reportOverdueItems}</b></div></div><table><thead><tr><th>م</th>${headerCells}</tr></thead><tbody>${rows || `<tr><td colspan="${selectedColumnDefs.length + 1}">لا توجد زيارات مطابقة</td></tr>`}</tbody></table><div class="footer"><span>منصة IAU Deeds — البرنامج الميداني</span><span>${html(new Date().toLocaleString('ar-SA-u-ca-gregory'))}</span></div><script>window.onload=()=>setTimeout(()=>window.print(),250)<\/script></body></html>`);
    report.document.close();
    setProgramPrintDialog(false);
  };

'''
text = text[:start] + new_function + text[end:]

text = text.replace(
    '<DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-[780px]" dir="rtl">',
    '<DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-[920px]" dir="rtl">',
    1,
)
text = text.replace(
    '<DialogDescription>حدد عنوان التقرير ومعايير الفرز والتصفية قبل الانتقال إلى الطباعة. يتم تحديث عدد النتائج مباشرة.</DialogDescription>',
    '<DialogDescription>حدد عنوان التقرير ومعايير الفرز والتصفية والأعمدة التي تريد ظهورها في الجدول قبل الانتقال إلى الطباعة. يتم تحديث عدد النتائج مباشرة.</DialogDescription>',
    1,
)

if 'الأعمدة الظاهرة في جدول الطباعة' not in text:
    modal_anchor = """          </div>\n        </div>\n        <DialogFooter className=\"gap-2\"><Button variant=\"outline\" onClick={() => setProgramPrintDialog(false)}>إلغاء</Button><Button onClick={printProgramReport} disabled={!filteredVisits.length}><Printer className=\"ml-2 h-4 w-4\" />متابعة إلى الطباعة</Button></DialogFooter>"""
    modal_replacement = """          </div>\n          <div className=\"rounded-2xl border border-slate-200 bg-white p-3 shadow-sm\">\n            <div className=\"mb-3 flex flex-wrap items-start justify-between gap-2\">\n              <div><b className=\"text-sm text-slate-800\">الأعمدة الظاهرة في جدول الطباعة</b><p className=\"mt-1 text-[11px] text-slate-500\">اختر الأعمدة التي يحتاجها التقرير فقط. عمود التسلسل «م» يظهر تلقائيًا، وترتيب الأعمدة يبقى بالترتيب القياسي.</p></div>\n              <Badge variant=\"outline\">{programPrintColumns.length} عمود مختار</Badge>\n            </div>\n            <div className=\"mb-3 flex flex-wrap gap-2\">\n              <Button type=\"button\" size=\"sm\" variant=\"outline\" onClick={() => setProgramPrintColumns([...defaultProgramReportColumns])}>الافتراضي</Button>\n              <Button type=\"button\" size=\"sm\" variant=\"outline\" onClick={() => setProgramPrintColumns([...basicProgramReportColumns])}>أساسي</Button>\n              <Button type=\"button\" size=\"sm\" variant=\"outline\" onClick={() => setProgramPrintColumns([...followUpProgramReportColumns])}>متابعة ومعالجة</Button>\n              <Button type=\"button\" size=\"sm\" variant=\"outline\" onClick={() => setProgramPrintColumns(programReportColumns.map((column) => column.key))}>جميع الأعمدة</Button>\n            </div>\n            <div className=\"grid gap-2 sm:grid-cols-2 lg:grid-cols-4\">\n              {programReportColumns.map((column) => {\n                const selected = programPrintColumns.includes(column.key);\n                return <button key={column.key} type=\"button\" aria-pressed={selected} className={`flex min-h-10 items-center gap-2 rounded-xl border px-3 py-2 text-right text-xs font-semibold transition ${selected ? 'border-sky-300 bg-sky-50 text-sky-800 shadow-sm' : 'border-slate-200 bg-slate-50 text-slate-500 hover:bg-slate-100'}`} onClick={() => setProgramPrintColumns((current) => current.includes(column.key) ? (current.length === 1 ? current : current.filter((key) => key !== column.key)) : [...current, column.key])}><span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border text-[11px] ${selected ? 'border-sky-500 bg-sky-600 text-white' : 'border-slate-300 bg-white text-transparent'}`}>✓</span><span>{column.label}</span></button>;\n              })}\n            </div>\n          </div>\n        </div>\n        <DialogFooter className=\"gap-2\"><Button variant=\"outline\" onClick={() => setProgramPrintDialog(false)}>إلغاء</Button><Button onClick={printProgramReport} disabled={!filteredVisits.length}><Printer className=\"ml-2 h-4 w-4\" />متابعة إلى الطباعة</Button></DialogFooter>"""
    if modal_anchor not in text:
        raise SystemExit('Could not find program print modal footer anchor')
    text = text.replace(modal_anchor, modal_replacement, 1)

path.write_text(text, encoding='utf-8')
print('Applied flexible program report column selection')
