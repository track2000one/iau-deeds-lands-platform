import fs from 'node:fs';

const filePath = 'src/app/components/MosqueFieldVisitsPanel.tsx';
let source = fs.readFileSync(filePath, 'utf8');

const replaceOnce = (search, replacement, label) => {
  if (!source.includes(search)) throw new Error(`${label} marker not found`);
  source = source.replace(search, replacement);
};

replaceOnce(
`  const [search, setSearch] = React.useState('');
  const [siteFilter, setSiteFilter] = React.useState('');
  const [statusFilter, setStatusFilter] = React.useState('');`,
`  const [search, setSearch] = React.useState('');
  const [siteFilter, setSiteFilter] = React.useState('');
  const [statusFilter, setStatusFilter] = React.useState('');
  const [visitTypeFilter, setVisitTypeFilter] = React.useState('');
  const [overallFilter, setOverallFilter] = React.useState('');
  const [priorityFilter, setPriorityFilter] = React.useState('');
  const [issueFilter, setIssueFilter] = React.useState('');
  const [dateFromFilter, setDateFromFilter] = React.useState('');
  const [dateToFilter, setDateToFilter] = React.useState('');
  const [sortBy, setSortBy] = React.useState<'date' | 'site' | 'visit_number' | 'status' | 'open_items' | 'priority'>('date');
  const [sortDirection, setSortDirection] = React.useState<'asc' | 'desc'>('desc');
  const [showAdvancedFilters, setShowAdvancedFilters] = React.useState(false);`,
'filter state'
);

replaceOnce(
`  const [printTarget, setPrintTarget] = React.useState<MosqueFieldVisit | null>(null);
  const [includePrintImages, setIncludePrintImages] = React.useState(true);
  const [preparingPrint, setPreparingPrint] = React.useState(false);`,
`  const [printTarget, setPrintTarget] = React.useState<MosqueFieldVisit | null>(null);
  const [includePrintImages, setIncludePrintImages] = React.useState(true);
  const [preparingPrint, setPreparingPrint] = React.useState(false);
  const [programPrintDialog, setProgramPrintDialog] = React.useState(false);
  const [programReportTitle, setProgramReportTitle] = React.useState('تقرير البرنامج الميداني للمساجد والمصليات');`,
'print state'
);

replaceOnce(
`  const filteredVisits = React.useMemo(() => visits.filter((visit) => {
    const needle = search.trim().toLowerCase();
    const matchesSearch = !needle || [visit.visitNumber, visit.site.name, visit.site.campusLocation, visit.representativeName]
      .some((value) => String(value || '').toLowerCase().includes(needle));
    return matchesSearch && (!siteFilter || visit.siteId === siteFilter) && (!statusFilter || visit.workflowStatus === statusFilter);
  }), [visits, search, siteFilter, statusFilter]);`,
`  const filteredVisits = React.useMemo(() => {
    const fromTime = dateFromFilter ? new Date(\`${'${dateFromFilter}'}T00:00:00\`).getTime() : null;
    const toTime = dateToFilter ? new Date(\`${'${dateToFilter}'}T23:59:59.999\`).getTime() : null;
    const priorityOrder: Record<string, number> = { low: 1, normal: 2, medium: 3, high: 4, urgent: 5 };
    const openCount = (visit: MosqueFieldVisit) => visit.items.filter((item) => item.status === 'needs_action' && !['resolved', 'closed'].includes(item.resolutionStatus)).length;
    const urgentCount = (visit: MosqueFieldVisit) => visit.items.filter((item) => item.priority === 'urgent' && item.status === 'needs_action' && !['resolved', 'closed'].includes(item.resolutionStatus)).length;
    const overdueCount = (visit: MosqueFieldVisit) => visit.items.filter((item) => item.status === 'needs_action' && item.dueDate && new Date(item.dueDate).getTime() < Date.now() && !['resolved', 'closed'].includes(item.resolutionStatus)).length;

    const filtered = visits.filter((visit) => {
      const needle = search.trim().toLowerCase();
      const matchesSearch = !needle || [
        visit.visitNumber,
        visit.site.name,
        visit.site.campusLocation,
        visit.representativeName,
        ...(visit.teamMembers || []),
      ].some((value) => String(value || '').toLowerCase().includes(needle));
      const visitTime = new Date(visit.visitDate).getTime();
      const matchesIssue = !issueFilter
        || (issueFilter === 'open' && openCount(visit) > 0)
        || (issueFilter === 'urgent' && urgentCount(visit) > 0)
        || (issueFilter === 'overdue' && overdueCount(visit) > 0)
        || (issueFilter === 'clear' && openCount(visit) === 0);

      return matchesSearch
        && (!siteFilter || visit.siteId === siteFilter)
        && (!statusFilter || visit.workflowStatus === statusFilter)
        && (!visitTypeFilter || visit.visitType === visitTypeFilter)
        && (!overallFilter || visit.overallStatus === overallFilter)
        && (!priorityFilter || visit.priority === priorityFilter)
        && matchesIssue
        && (fromTime === null || visitTime >= fromTime)
        && (toTime === null || visitTime <= toTime);
    });

    const direction = sortDirection === 'asc' ? 1 : -1;
    return [...filtered].sort((a, b) => {
      let comparison = 0;
      if (sortBy === 'site') comparison = String(a.site.name || '').localeCompare(String(b.site.name || ''), 'ar');
      else if (sortBy === 'visit_number') comparison = String(a.visitNumber || '').localeCompare(String(b.visitNumber || ''), 'ar', { numeric: true });
      else if (sortBy === 'status') comparison = String(visitStatusLabels[a.workflowStatus] || '').localeCompare(String(visitStatusLabels[b.workflowStatus] || ''), 'ar');
      else if (sortBy === 'open_items') comparison = openCount(a) - openCount(b);
      else if (sortBy === 'priority') comparison = (priorityOrder[a.priority] || 0) - (priorityOrder[b.priority] || 0);
      else comparison = new Date(a.visitDate).getTime() - new Date(b.visitDate).getTime();
      return comparison * direction;
    });
  }, [visits, search, siteFilter, statusFilter, visitTypeFilter, overallFilter, priorityFilter, issueFilter, dateFromFilter, dateToFilter, sortBy, sortDirection]);

  const activeFilterCount = [search, siteFilter, statusFilter, visitTypeFilter, overallFilter, priorityFilter, issueFilter, dateFromFilter, dateToFilter]
    .filter((value) => Boolean(String(value || '').trim())).length;

  const resetVisitFilters = () => {
    setSearch('');
    setSiteFilter('');
    setStatusFilter('');
    setVisitTypeFilter('');
    setOverallFilter('');
    setPriorityFilter('');
    setIssueFilter('');
    setDateFromFilter('');
    setDateToFilter('');
    setSortBy('date');
    setSortDirection('desc');
  };`,
'filtered visits memo'
);

const oldPrintProgramStart = `  const printProgramReport = () => {
    const rows = filteredVisits.map((visit, index) => {
      const open = visit.items.filter((item) => item.status === 'needs_action' && !['resolved', 'closed'].includes(item.resolutionStatus)).length;
      const urgent = visit.items.filter((item) => item.priority === 'urgent' && !['resolved', 'closed'].includes(item.resolutionStatus)).length;
      return \`<tr><td>\${index + 1}</td><td>\${html(visit.visitNumber)}</td><td class=\"right\">\${html(visit.site.name)}</td><td>\${html(visitTypeLabels[visit.visitType])}</td><td>\${html(new Date(visit.visitDate).toLocaleDateString('ar-SA-u-ca-gregory'))}</td><td>\${html(overallLabels[visit.overallStatus])}</td><td>\${open}</td><td>\${urgent}</td><td>\${html(visitStatusLabels[visit.workflowStatus])}</td></tr>\`;
    }).join('');`;

const newPrintProgramStart = `  const openProgramPrintDialog = () => {
    if (!programReportTitle.trim()) setProgramReportTitle('تقرير البرنامج الميداني للمساجد والمصليات');
    setProgramPrintDialog(true);
  };

  const printProgramReport = () => {
    const reportTitle = programReportTitle.trim() || 'تقرير البرنامج الميداني للمساجد والمصليات';
    const openCount = (visit: MosqueFieldVisit) => visit.items.filter((item) => item.status === 'needs_action' && !['resolved', 'closed'].includes(item.resolutionStatus)).length;
    const urgentCount = (visit: MosqueFieldVisit) => visit.items.filter((item) => item.priority === 'urgent' && item.status === 'needs_action' && !['resolved', 'closed'].includes(item.resolutionStatus)).length;
    const overdueCount = (visit: MosqueFieldVisit) => visit.items.filter((item) => item.status === 'needs_action' && item.dueDate && new Date(item.dueDate).getTime() < Date.now() && !['resolved', 'closed'].includes(item.resolutionStatus)).length;
    const reportOpenItems = filteredVisits.reduce((total, visit) => total + openCount(visit), 0);
    const reportUrgentItems = filteredVisits.reduce((total, visit) => total + urgentCount(visit), 0);
    const reportOverdueItems = filteredVisits.reduce((total, visit) => total + overdueCount(visit), 0);
    const reportSiteCount = new Set(filteredVisits.map((visit) => visit.siteId)).size;
    const reportCompleted = filteredVisits.filter((visit) => ['completed', 'closed'].includes(visit.workflowStatus)).length;
    const rows = filteredVisits.map((visit, index) => {
      const open = openCount(visit);
      const urgent = urgentCount(visit);
      return \`<tr><td>\${index + 1}</td><td>\${html(visit.visitNumber)}</td><td class=\"right\">\${html(visit.site.name)}</td><td>\${html(visitTypeLabels[visit.visitType])}</td><td>\${html(new Date(visit.visitDate).toLocaleDateString('ar-SA-u-ca-gregory'))}</td><td>\${html(overallLabels[visit.overallStatus])}</td><td>\${open}</td><td>\${urgent}</td><td>\${html(visitStatusLabels[visit.workflowStatus])}</td></tr>\`;
    }).join('');`;
replaceOnce(oldPrintProgramStart, newPrintProgramStart, 'print program start');

const oldReportWrite = `    report.document.write(\`<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><title>تقرير البرنامج الميداني</title><style>@page{size:A4 landscape;margin:10mm}*{box-sizing:border-box;-webkit-print-color-adjust:exact;print-color-adjust:exact}body{font-family:Tahoma,Arial,sans-serif;color:#172033;margin:0}.head{border:2px solid #0369a1;border-radius:16px;padding:16px;background:linear-gradient(135deg,#f0f9ff,#fff,#ecfdf5)}.kicker{font-size:11px;color:#0369a1;font-weight:bold}h1{font-size:24px;margin:6px 0}.metrics{display:grid;grid-template-columns:repeat(6,1fr);gap:8px;margin:14px 0}.metric{border:1px solid #cbd5e1;border-radius:10px;padding:10px;text-align:center;background:#fff}.metric small{display:block;color:#64748b}.metric b{display:block;font-size:22px;margin-top:4px}table{width:100%;border-collapse:collapse;font-size:10px}th,td{border:1px solid #cbd5e1;padding:7px;text-align:center}th{background:#e2e8f0}.right{text-align:right}.footer{display:flex;justify-content:space-between;margin-top:12px;font-size:9px;color:#64748b}</style></head><body><div class="head"><div class="kicker">جامعة الإمام عبدالرحمن بن فيصل — وحدة العناية بالمساجد والمصليات الجامعية</div><h1>تقرير البرنامج الميداني للمساجد والمصليات</h1><div>تم تطبيق معايير البحث والتصفية الظاهرة في المنصة قبل إنشاء التقرير.</div></div><div class="metrics"><div class="metric"><small>إجمالي المواقع</small><b>\${summary.totalSites}</b></div><div class="metric"><small>تمت زيارتها</small><b>\${summary.visitedSites}</b></div><div class="metric"><small>نسبة التغطية</small><b>\${summary.coveragePercent}%</b></div><div class="metric"><small>الملاحظات المفتوحة</small><b>\${summary.openItems}</b></div><div class="metric"><small>العاجلة</small><b>\${summary.urgentItems}</b></div><div class="metric"><small>المتأخرة</small><b>\${summary.overdueItems}</b></div></div><table><thead><tr><th>م</th><th>رقم الزيارة</th><th>المسجد / المصلى</th><th>النوع</th><th>التاريخ</th><th>الحالة العامة</th><th>مفتوحة</th><th>عاجلة</th><th>حالة الزيارة</th></tr></thead><tbody>\${rows || '<tr><td colspan="9">لا توجد زيارات مطابقة</td></tr>'}</tbody></table><div class="footer"><span>منصة IAU Deeds — البرنامج الميداني</span><span>\${html(new Date().toLocaleString('ar-SA-u-ca-gregory'))}</span></div><script>window.onload=()=>setTimeout(()=>window.print(),250)<\\/script></body></html>\`);
    report.document.close();`;

const newReportWrite = `    report.document.write(\`<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><title>\${html(reportTitle)}</title><style>@page{size:A4 landscape;margin:10mm}*{box-sizing:border-box;-webkit-print-color-adjust:exact;print-color-adjust:exact}body{font-family:Tahoma,Arial,sans-serif;color:#172033;margin:0}.head{border:2px solid #0369a1;border-radius:16px;padding:16px;background:linear-gradient(135deg,#f0f9ff,#fff,#ecfdf5)}.kicker{font-size:11px;color:#0369a1;font-weight:bold}h1{font-size:24px;margin:6px 0}.subtitle{font-size:11px;color:#475569}.metrics{display:grid;grid-template-columns:repeat(6,1fr);gap:8px;margin:14px 0}.metric{border:1px solid #cbd5e1;border-radius:10px;padding:10px;text-align:center;background:#fff}.metric small{display:block;color:#64748b}.metric b{display:block;font-size:22px;margin-top:4px}table{width:100%;border-collapse:collapse;font-size:10px}th,td{border:1px solid #cbd5e1;padding:7px;text-align:center}th{background:#e2e8f0}.right{text-align:right}.footer{display:flex;justify-content:space-between;margin-top:12px;font-size:9px;color:#64748b}</style></head><body><div class="head"><div class="kicker">جامعة الإمام عبدالرحمن بن فيصل — وحدة العناية بالمساجد والمصليات الجامعية</div><h1>\${html(reportTitle)}</h1><div class="subtitle">تم إنشاء التقرير من \${filteredVisits.length} زيارة وفق الفرز والتصفية الحالية\${activeFilterCount ? \` (\${activeFilterCount} معيار تصفية)\` : ''}.</div></div><div class="metrics"><div class="metric"><small>الزيارات في التقرير</small><b>\${filteredVisits.length}</b></div><div class="metric"><small>المواقع</small><b>\${reportSiteCount}</b></div><div class="metric"><small>المكتملة / المغلقة</small><b>\${reportCompleted}</b></div><div class="metric"><small>الملاحظات المفتوحة</small><b>\${reportOpenItems}</b></div><div class="metric"><small>العاجلة</small><b>\${reportUrgentItems}</b></div><div class="metric"><small>المتأخرة</small><b>\${reportOverdueItems}</b></div></div><table><thead><tr><th>م</th><th>رقم الزيارة</th><th>المسجد / المصلى</th><th>النوع</th><th>التاريخ</th><th>الحالة العامة</th><th>مفتوحة</th><th>عاجلة</th><th>حالة الزيارة</th></tr></thead><tbody>\${rows || '<tr><td colspan="9">لا توجد زيارات مطابقة</td></tr>'}</tbody></table><div class="footer"><span>منصة IAU Deeds — البرنامج الميداني</span><span>\${html(new Date().toLocaleString('ar-SA-u-ca-gregory'))}</span></div><script>window.onload=()=>setTimeout(()=>window.print(),250)<\\/script></body></html>\`);
    report.document.close();
    setProgramPrintDialog(false);`;
replaceOnce(oldReportWrite, newReportWrite, 'report HTML');

replaceOnce(
`          {canPrint && <Button variant="outline" onClick={printProgramReport}><Printer className="ml-2 h-4 w-4" />تقرير البرنامج</Button>}`,
`          {canPrint && <Button variant="outline" onClick={openProgramPrintDialog}><Printer className="ml-2 h-4 w-4" />تقرير البرنامج</Button>}`,
'program print button'
);

replaceOnce(
`          {view === 'visits' && <div className="grid flex-1 gap-2 sm:grid-cols-3 md:max-w-4xl">
            <div className="relative"><Search className="absolute right-3 top-3 h-4 w-4 text-slate-400" /><Input className="pr-9" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="بحث برقم الزيارة أو الموقع" /></div>
            <NativeSelect value={siteFilter} onChange={(event) => setSiteFilter(event.target.value)}><option value="">جميع المواقع</option>{sites.map((site) => <option key={site.id} value={site.id}>{site.name}</option>)}</NativeSelect>
            <NativeSelect value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}><option value="">جميع الحالات</option>{Object.entries(visitStatusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</NativeSelect>
          </div>}`,
`          {view === 'visits' && <div className="flex-1 space-y-2 md:max-w-5xl">
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
              <div className="relative"><Search className="absolute right-3 top-3 h-4 w-4 text-slate-400" /><Input className="pr-9" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="بحث برقم الزيارة أو الموقع أو المنفذ" /></div>
              <NativeSelect value={siteFilter} onChange={(event) => setSiteFilter(event.target.value)}><option value="">جميع المواقع</option>{sites.map((site) => <option key={site.id} value={site.id}>{site.name}</option>)}</NativeSelect>
              <NativeSelect value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}><option value="">جميع حالات الزيارة</option>{Object.entries(visitStatusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</NativeSelect>
              <Button type="button" variant={showAdvancedFilters || activeFilterCount > 3 ? 'secondary' : 'outline'} onClick={() => setShowAdvancedFilters((current) => !current)}>تصفية وفرز متقدم{activeFilterCount ? ` (${activeFilterCount})` : ''}</Button>
            </div>
            {showAdvancedFilters && <div className="rounded-2xl border border-sky-100 bg-slate-50/80 p-3 shadow-sm">
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                <NativeSelect value={visitTypeFilter} onChange={(event) => setVisitTypeFilter(event.target.value)}><option value="">جميع أنواع الزيارة</option>{Object.entries(visitTypeLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</NativeSelect>
                <NativeSelect value={overallFilter} onChange={(event) => setOverallFilter(event.target.value)}><option value="">جميع الحالات العامة</option>{Object.entries(overallLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</NativeSelect>
                <NativeSelect value={priorityFilter} onChange={(event) => setPriorityFilter(event.target.value)}><option value="">جميع الأولويات</option>{Object.entries(priorityLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</NativeSelect>
                <NativeSelect value={issueFilter} onChange={(event) => setIssueFilter(event.target.value)}><option value="">كل نتائج الفحص</option><option value="open">بها ملاحظات مفتوحة</option><option value="urgent">بها ملاحظات عاجلة</option><option value="overdue">بها ملاحظات متأخرة</option><option value="clear">بدون ملاحظات مفتوحة</option></NativeSelect>
                <Field label="من تاريخ"><Input type="date" value={dateFromFilter} onChange={(event) => setDateFromFilter(event.target.value)} /></Field>
                <Field label="إلى تاريخ"><Input type="date" value={dateToFilter} onChange={(event) => setDateToFilter(event.target.value)} /></Field>
                <Field label="الفرز حسب"><NativeSelect value={sortBy} onChange={(event) => setSortBy(event.target.value as typeof sortBy)}><option value="date">تاريخ الزيارة</option><option value="site">المسجد / المصلى</option><option value="visit_number">رقم الزيارة</option><option value="status">حالة الزيارة</option><option value="open_items">عدد الملاحظات المفتوحة</option><option value="priority">الأولوية العامة</option></NativeSelect></Field>
                <Field label="اتجاه الفرز"><NativeSelect value={sortDirection} onChange={(event) => setSortDirection(event.target.value as 'asc' | 'desc')}><option value="desc">تنازلي / الأحدث أولًا</option><option value="asc">تصاعدي / الأقدم أولًا</option></NativeSelect></Field>
              </div>
              <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t pt-3"><span className="text-xs font-semibold text-slate-600">النتائج الحالية: {filteredVisits.length} من {visits.length} زيارة</span><Button type="button" size="sm" variant="outline" onClick={resetVisitFilters}>مسح التصفية وإعادة الفرز</Button></div>
            </div>}
          </div>}`,
'filter UI'
);

const dialogMarker = `    <Dialog open={Boolean(printTarget)} onOpenChange={(open) => { if (!open && !preparingPrint) setPrintTarget(null); }}>`;
const programDialog = `    <Dialog open={programPrintDialog} onOpenChange={setProgramPrintDialog}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-[780px]" dir="rtl">
        <DialogHeader className="text-right">
          <DialogTitle className="flex items-center gap-2"><Printer className="h-5 w-5 text-sky-700" />إعداد تقرير البرنامج الميداني</DialogTitle>
          <DialogDescription>حدد عنوان التقرير ومعايير الفرز والتصفية قبل الانتقال إلى الطباعة. يتم تحديث عدد النتائج مباشرة.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <Field label="عنوان التقرير / اسم الجدول">
            <Input value={programReportTitle} onChange={(event) => setProgramReportTitle(event.target.value)} placeholder="مثال: جدول الزيارات الميدانية لمساجد الحرم الشرقي" autoFocus />
          </Field>
          <div className="rounded-2xl border border-sky-100 bg-sky-50/50 p-3">
            <div className="mb-3 flex items-center justify-between"><b className="text-sm text-slate-800">الفرز والتصفية</b><Badge variant="outline">{filteredVisits.length} زيارة</Badge></div>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              <NativeSelect value={siteFilter} onChange={(event) => setSiteFilter(event.target.value)}><option value="">جميع المواقع</option>{sites.map((site) => <option key={site.id} value={site.id}>{site.name}</option>)}</NativeSelect>
              <NativeSelect value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}><option value="">جميع حالات الزيارة</option>{Object.entries(visitStatusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</NativeSelect>
              <NativeSelect value={visitTypeFilter} onChange={(event) => setVisitTypeFilter(event.target.value)}><option value="">جميع أنواع الزيارة</option>{Object.entries(visitTypeLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</NativeSelect>
              <NativeSelect value={overallFilter} onChange={(event) => setOverallFilter(event.target.value)}><option value="">جميع الحالات العامة</option>{Object.entries(overallLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</NativeSelect>
              <NativeSelect value={priorityFilter} onChange={(event) => setPriorityFilter(event.target.value)}><option value="">جميع الأولويات</option>{Object.entries(priorityLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</NativeSelect>
              <NativeSelect value={issueFilter} onChange={(event) => setIssueFilter(event.target.value)}><option value="">كل نتائج الفحص</option><option value="open">بها ملاحظات مفتوحة</option><option value="urgent">بها ملاحظات عاجلة</option><option value="overdue">بها ملاحظات متأخرة</option><option value="clear">بدون ملاحظات مفتوحة</option></NativeSelect>
              <Field label="من تاريخ"><Input type="date" value={dateFromFilter} onChange={(event) => setDateFromFilter(event.target.value)} /></Field>
              <Field label="إلى تاريخ"><Input type="date" value={dateToFilter} onChange={(event) => setDateToFilter(event.target.value)} /></Field>
              <Field label="الفرز حسب"><NativeSelect value={sortBy} onChange={(event) => setSortBy(event.target.value as typeof sortBy)}><option value="date">تاريخ الزيارة</option><option value="site">المسجد / المصلى</option><option value="visit_number">رقم الزيارة</option><option value="status">حالة الزيارة</option><option value="open_items">الملاحظات المفتوحة</option><option value="priority">الأولوية العامة</option></NativeSelect></Field>
              <Field label="اتجاه الفرز"><NativeSelect value={sortDirection} onChange={(event) => setSortDirection(event.target.value as 'asc' | 'desc')}><option value="desc">تنازلي / الأحدث أولًا</option><option value="asc">تصاعدي / الأقدم أولًا</option></NativeSelect></Field>
            </div>
            <div className="mt-3 flex items-center justify-between gap-2 border-t border-sky-100 pt-3"><span className="text-xs text-slate-600">{activeFilterCount ? `تم تطبيق ${activeFilterCount} معيار تصفية.` : 'سيتم تضمين جميع الزيارات.'}</span><Button type="button" size="sm" variant="outline" onClick={resetVisitFilters}>إعادة ضبط</Button></div>
          </div>
        </div>
        <DialogFooter className="gap-2"><Button variant="outline" onClick={() => setProgramPrintDialog(false)}>إلغاء</Button><Button onClick={printProgramReport} disabled={!filteredVisits.length}><Printer className="ml-2 h-4 w-4" />متابعة إلى الطباعة</Button></DialogFooter>
      </DialogContent>
    </Dialog>

${dialogMarker}`;
replaceOnce(dialogMarker, programDialog, 'program print dialog');

fs.writeFileSync(filePath, source);
console.log('Applied flexible mosque field visit filtering, sorting, and editable program report title.');
