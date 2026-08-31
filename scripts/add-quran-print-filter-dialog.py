from pathlib import Path
import re

path = Path('src/app/pages/MosquesUnitPage.tsx')
text = path.read_text(encoding='utf-8')

# 1) Add print filter/sort types.
type_anchor = "const emptyQuranSummary: MosqueQuranInventorySummary = { sites: 0, countedSites: 0, total: 0, large: 0, medium: 0, small: 0, damaged: 0, needed: 0 };\n"
type_insert = """const emptyQuranSummary: MosqueQuranInventorySummary = { sites: 0, countedSites: 0, total: 0, large: 0, medium: 0, small: 0, damaged: 0, needed: 0 };\n\ntype QuranPrintSiteFilter = 'all' | 'mosque' | 'jami' | 'prayer_room_men' | 'prayer_room_women';\ntype QuranPrintStateFilter = 'all' | 'with_stock' | 'without_stock' | 'need' | 'damaged' | 'not_counted';\ntype QuranPrintSortKey = 'name' | 'total' | 'large' | 'medium' | 'small' | 'damaged' | 'needed' | 'last_count';\ntype QuranPrintSortDirection = 'asc' | 'desc';\n"""
if 'type QuranPrintSiteFilter' not in text:
    if type_anchor not in text:
        raise SystemExit('Quran summary anchor not found')
    text = text.replace(type_anchor, type_insert, 1)

# 2) Add dialog/filter state.
state_anchor = "  const [quranSearch, setQuranSearch] = useState('');\n  const [quranNeedOnly, setQuranNeedOnly] = useState(false);\n"
state_insert = """  const [quranSearch, setQuranSearch] = useState('');\n  const [quranNeedOnly, setQuranNeedOnly] = useState(false);\n  const [quranPrintDialog, setQuranPrintDialog] = useState(false);\n  const [quranPrintSearch, setQuranPrintSearch] = useState('');\n  const [quranPrintSiteFilter, setQuranPrintSiteFilter] = useState<QuranPrintSiteFilter>('all');\n  const [quranPrintStateFilter, setQuranPrintStateFilter] = useState<QuranPrintStateFilter>('all');\n  const [quranPrintSortKey, setQuranPrintSortKey] = useState<QuranPrintSortKey>('name');\n  const [quranPrintSortDirection, setQuranPrintSortDirection] = useState<QuranPrintSortDirection>('asc');\n"""
if 'const [quranPrintDialog' not in text:
    if state_anchor not in text:
        raise SystemExit('Quran state anchor not found')
    text = text.replace(state_anchor, state_insert, 1)

# 3) Replace simple print function with professional print preparation/filtering.
pattern = re.compile(r"  const printQuranInventory = \(\) => \{.*?\n  \};\n\n\n  const toggleSitePrintColumn", re.S)
replacement = r'''  const quranPrintRows = useMemo(() => {
    const q = quranPrintSearch.trim().toLowerCase();
    const rows = quranInventoryItems.map((item) => {
      const site = (sites.find((row) => row.id === item.site.id) || item.site) as MosqueSite;
      const latest = item.latest;
      const systemStock = quranStockDashboard?.sites.find((row) => row.site.id === item.site.id)?.systemStock;
      const large = Number(systemStock?.largeCount ?? latest?.largeCount ?? 0);
      const medium = Number(systemStock?.mediumCount ?? latest?.mediumCount ?? 0);
      const small = Number(systemStock?.smallCount ?? latest?.smallCount ?? 0);
      const total = large + medium + small;
      const damaged = Number(latest?.damagedCount ?? 0);
      const needed = Number(latest?.neededCount ?? 0);
      const lastCountAt = latest?.countedAt ? new Date(latest.countedAt).getTime() : 0;
      return { item, site, latest, large, medium, small, total, damaged, needed, lastCountAt };
    }).filter((row) => {
      const matchesSearch = !q || [row.site.name, row.site.city, row.site.district, row.site.campusLocation]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(q));
      const matchesSite = quranPrintSiteFilter === 'all'
        || (quranPrintSiteFilter === 'mosque' && row.site.siteType === 'mosque')
        || (quranPrintSiteFilter === 'jami' && row.site.siteType === 'jami')
        || (quranPrintSiteFilter === 'prayer_room_men' && row.site.siteType === 'prayer_room' && row.site.prayerRoomGender === 'men')
        || (quranPrintSiteFilter === 'prayer_room_women' && row.site.siteType === 'prayer_room' && row.site.prayerRoomGender === 'women');
      const matchesState = quranPrintStateFilter === 'all'
        || (quranPrintStateFilter === 'with_stock' && row.total > 0)
        || (quranPrintStateFilter === 'without_stock' && row.total === 0)
        || (quranPrintStateFilter === 'need' && row.needed > 0)
        || (quranPrintStateFilter === 'damaged' && row.damaged > 0)
        || (quranPrintStateFilter === 'not_counted' && !row.latest);
      return matchesSearch && matchesSite && matchesState;
    });

    rows.sort((a, b) => {
      let compared = 0;
      if (quranPrintSortKey === 'name') compared = (a.site.name || '').localeCompare(b.site.name || '', 'ar', { numeric: true, sensitivity: 'base' });
      else if (quranPrintSortKey === 'last_count') compared = a.lastCountAt - b.lastCountAt;
      else compared = Number(a[quranPrintSortKey]) - Number(b[quranPrintSortKey]);
      if (compared === 0) compared = (a.site.name || '').localeCompare(b.site.name || '', 'ar', { numeric: true, sensitivity: 'base' });
      return quranPrintSortDirection === 'desc' ? compared * -1 : compared;
    });
    return rows;
  }, [quranInventoryItems, sites, quranStockDashboard, quranPrintSearch, quranPrintSiteFilter, quranPrintStateFilter, quranPrintSortKey, quranPrintSortDirection]);

  const quranPrintStats = useMemo(() => quranPrintRows.reduce((stats, row) => ({
    sites: stats.sites + 1,
    total: stats.total + row.total,
    large: stats.large + row.large,
    medium: stats.medium + row.medium,
    small: stats.small + row.small,
    damaged: stats.damaged + row.damaged,
    needed: stats.needed + row.needed,
  }), { sites: 0, total: 0, large: 0, medium: 0, small: 0, damaged: 0, needed: 0 }), [quranPrintRows]);

  const openQuranPrintDialog = () => {
    setQuranPrintSearch(quranSearch);
    setQuranPrintSiteFilter('all');
    setQuranPrintStateFilter(quranNeedOnly ? 'need' : 'all');
    setQuranPrintSortKey('name');
    setQuranPrintSortDirection('asc');
    setQuranPrintDialog(true);
  };

  const resetQuranPrintFilters = () => {
    setQuranPrintSearch('');
    setQuranPrintSiteFilter('all');
    setQuranPrintStateFilter('all');
    setQuranPrintSortKey('name');
    setQuranPrintSortDirection('asc');
  };

  const printQuranInventory = () => {
    if (!quranPrintRows.length) return toast.info('لا توجد بيانات مصاحف مطابقة لمعايير الطباعة');
    const printWindow = window.open('', '_blank', 'width=1400,height=950');
    if (!printWindow) return toast.error('تعذر فتح نافذة الطباعة. اسمح بالنوافذ المنبثقة ثم أعد المحاولة.');
    const esc = (value: unknown) => String(value ?? '').replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[char] || char));
    const siteFilterLabels: Record<QuranPrintSiteFilter, string> = { all: 'جميع المواقع', mosque: 'المساجد', jami: 'الجوامع', prayer_room_men: 'مصليات الرجال', prayer_room_women: 'مصليات النساء' };
    const stateFilterLabels: Record<QuranPrintStateFilter, string> = { all: 'جميع الحالات', with_stock: 'لديه رصيد', without_stock: 'بدون رصيد', need: 'لديه احتياج', damaged: 'لديه تالف', not_counted: 'لم يسبق جرده' };
    const sortLabels: Record<QuranPrintSortKey, string> = { name: 'اسم الموقع', total: 'الإجمالي', large: 'الكبيرة', medium: 'المتوسطة', small: 'الصغيرة', damaged: 'التالفة', needed: 'الاحتياج', last_count: 'آخر جرد' };
    const rows = quranPrintRows.map((row, index) => {
      const location = [row.site.campusLocation, row.site.city, row.site.district].filter(Boolean).join(' — ') || '-';
      return `<tr><td>${index + 1}</td><td class="name">${esc(row.site.name)}</td><td>${esc(siteTypeDisplayLabel(row.site))}</td><td class="location">${esc(location)}</td><td>${row.large}</td><td>${row.medium}</td><td>${row.small}</td><td class="total">${row.total}</td><td class="damaged">${row.damaged}</td><td class="needed">${row.needed}</td><td>${row.latest ? esc(new Date(row.latest.countedAt).toLocaleDateString('ar-SA-u-ca-gregory')) : 'لم يجرد'}</td></tr>`;
    }).join('');
    const filterSummary = [
      quranPrintSearch.trim() ? `بحث: ${quranPrintSearch.trim()}` : '',
      siteFilterLabels[quranPrintSiteFilter],
      stateFilterLabels[quranPrintStateFilter],
      `الترتيب: ${sortLabels[quranPrintSortKey]} (${quranPrintSortDirection === 'asc' ? 'تصاعدي' : 'تنازلي'})`,
    ].filter(Boolean).join(' — ');
    const html = `<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><title>تقرير حصر المصاحف</title><style>
      @page{size:A4 landscape;margin:6mm}*{box-sizing:border-box;-webkit-print-color-adjust:exact;print-color-adjust:exact}body{font-family:Tahoma,Arial,sans-serif;margin:0;color:#172033;font-size:8.5px;direction:rtl}.head{border:1px solid #cbd5e1;border-radius:10px;padding:10px 12px;background:linear-gradient(90deg,#f0fdfa,#fff,#eff6ff)}.kicker{font-size:8px;color:#64748b;margin-bottom:3px}.title-row{display:flex;justify-content:space-between;align-items:flex-end;gap:12px}h1{font-size:18px;margin:0;color:#123047}.count{border:1px solid #93c5fd;background:#eff6ff;border-radius:999px;padding:4px 10px;font-weight:800}.meta{color:#64748b;margin-top:4px}.filters{margin-top:7px;border-top:1px solid #dbeafe;padding-top:6px;color:#334155;font-size:8px}.metrics{display:grid;grid-template-columns:repeat(7,1fr);gap:5px;margin:8px 0}.metric{border:1px solid #cbd5e1;border-radius:7px;padding:6px;background:#f8fafc;text-align:center}.metric span{display:block;color:#64748b;font-size:7px}.metric b{display:block;font-size:13px;margin-top:2px}.metric.emerald{border-color:#a7f3d0;background:#ecfdf5}.metric.red{border-color:#fecaca;background:#fef2f2}.metric.amber{border-color:#fde68a;background:#fffbeb}table{width:100%;border-collapse:collapse;table-layout:fixed}th,td{border:1px solid #cbd5e1;padding:4px 3px;text-align:center;vertical-align:middle;line-height:1.45}th{background:#e0f2fe;font-weight:900;font-size:7.5px}.name{text-align:right;font-weight:800;width:15%}.location{text-align:right;font-size:7.5px;width:20%}.total{font-weight:900;background:#ecfdf5}.damaged{color:#b91c1c;font-weight:800}.needed{color:#b45309;font-weight:800}.footer{margin-top:7px;padding-top:5px;border-top:1px solid #e2e8f0;color:#64748b;font-size:7px;display:flex;justify-content:space-between;gap:10px}@media print{body{print-color-adjust:exact}}
    </style></head><body><div class="head"><div class="kicker">جامعة الإمام عبدالرحمن بن فيصل — وحدة العناية بالمساجد والمصليات الجامعية</div><div class="title-row"><h1>تقرير إدارة وحصر المصاحف</h1><span class="count">${quranPrintRows.length} موقع</span></div><div class="meta">تاريخ الاستخراج: ${esc(new Date().toLocaleString('ar-SA-u-ca-gregory'))}</div><div class="filters"><strong>معايير التقرير:</strong> ${esc(filterSummary)}</div></div><div class="metrics"><div class="metric"><span>المواقع</span><b>${quranPrintStats.sites}</b></div><div class="metric emerald"><span>إجمالي المصاحف</span><b>${quranPrintStats.total}</b></div><div class="metric"><span>الكبيرة</span><b>${quranPrintStats.large}</b></div><div class="metric"><span>المتوسطة</span><b>${quranPrintStats.medium}</b></div><div class="metric"><span>الصغيرة</span><b>${quranPrintStats.small}</b></div><div class="metric red"><span>التالفة</span><b>${quranPrintStats.damaged}</b></div><div class="metric amber"><span>الاحتياج</span><b>${quranPrintStats.needed}</b></div></div><table><thead><tr><th style="width:3%">م</th><th style="width:15%">المسجد / المصلى</th><th style="width:8%">النوع</th><th style="width:20%">الموقع</th><th>كبيرة</th><th>متوسطة</th><th>صغيرة</th><th>الإجمالي</th><th>تالفة</th><th>الاحتياج</th><th style="width:8%">آخر جرد</th></tr></thead><tbody>${rows}</tbody></table><div class="footer"><span>منصة إدارة الأملاك والأراضي — IAU Deeds</span><span>تم تطبيق الفرز والتصفية قبل إنشاء التقرير. المصاحف التالفة لا تضاف إلى إجمالي الأحجام.</span></div></body></html>`;
    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();
    setQuranPrintDialog(false);
    printWindow.focus();
    window.setTimeout(() => printWindow.print(), 300);
  };


  const toggleSitePrintColumn'''
if not pattern.search(text):
    raise SystemExit('printQuranInventory block not found')
text = pattern.sub(replacement, text, count=1)

# 4) Make the page button open the professional preparation dialog.
old_button = '{canPrint && <Button variant="outline" className={button3d} onClick={printQuranInventory}><Printer className="ml-2 h-4 w-4" />طباعة / PDF</Button>}'
new_button = '{canPrint && <Button variant="outline" className={button3d} onClick={openQuranPrintDialog}><Filter className="ml-2 h-4 w-4" />إعداد الطباعة / PDF</Button>}'
if old_button not in text:
    raise SystemExit('Quran print button not found')
text = text.replace(old_button, new_button, 1)

# 5) Insert professional print preparation dialog before the old inventory dialog.
dialog_anchor = '      <Dialog open={quranDialog} onOpenChange={setQuranDialog}>\n'
print_dialog = r'''      <Dialog open={quranPrintDialog} onOpenChange={setQuranPrintDialog}>
        <DialogContent className="grid h-[90dvh] max-h-[90dvh] grid-rows-[auto_minmax(0,1fr)_auto] overflow-hidden p-0 gap-0 border-sky-200/80 bg-gradient-to-br from-white via-sky-50/35 to-emerald-50/25 sm:max-w-[1120px]" dir="rtl">
          <DialogHeader className="border-b border-sky-100 bg-gradient-to-l from-sky-50 via-white to-emerald-50/60 p-5 text-right md:p-6">
            <DialogTitle className="flex items-center gap-2 text-xl font-black md:text-2xl"><Printer className="h-5 w-5 text-sky-700" />إعداد تقرير المصاحف للطباعة / PDF</DialogTitle>
            <DialogDescription>حدد نطاق التقرير وطريقة الفرز قبل الطباعة. تتحدث المعاينة والإحصائيات مباشرة وفق الخيارات المحددة.</DialogDescription>
          </DialogHeader>
          <div className="min-h-0 space-y-5 overflow-y-auto overscroll-contain p-4 pb-6 md:p-6">
            <Card className="overflow-hidden border-sky-200/80 bg-white/95 shadow-sm">
              <CardHeader className="border-b border-sky-100 bg-sky-50/60 pb-3"><CardTitle className="flex items-center gap-2 text-base"><Filter className="h-4 w-4 text-sky-700" />التصفية</CardTitle></CardHeader>
              <CardContent className="grid gap-4 pt-5 md:grid-cols-2 xl:grid-cols-4">
                <div className="md:col-span-2"><Field label="بحث داخل التقرير"><div className="relative"><Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><Input className="h-11 pr-10" value={quranPrintSearch} onChange={(e) => setQuranPrintSearch(e.target.value)} placeholder="اسم المسجد أو المصلى، المدينة، الحي، الموقع..." /></div></Field></div>
                <Field label="نوع الموقع"><NativeSelect className="h-11" value={quranPrintSiteFilter} onChange={(e) => setQuranPrintSiteFilter(e.target.value as QuranPrintSiteFilter)}><option value="all">جميع المواقع</option><option value="mosque">المساجد فقط</option><option value="jami">الجوامع فقط</option><option value="prayer_room_men">مصليات الرجال</option><option value="prayer_room_women">مصليات النساء</option></NativeSelect></Field>
                <Field label="حالة الرصيد"><NativeSelect className="h-11" value={quranPrintStateFilter} onChange={(e) => setQuranPrintStateFilter(e.target.value as QuranPrintStateFilter)}><option value="all">جميع الحالات</option><option value="with_stock">لديه رصيد</option><option value="without_stock">بدون رصيد</option><option value="need">لديه احتياج</option><option value="damaged">لديه مصاحف تالفة</option><option value="not_counted">لم يسبق جرده</option></NativeSelect></Field>
              </CardContent>
            </Card>

            <Card className="overflow-hidden border-emerald-200/80 bg-white/95 shadow-sm">
              <CardHeader className="border-b border-emerald-100 bg-emerald-50/50 pb-3"><CardTitle className="text-base">الفرز وترتيب التقرير</CardTitle></CardHeader>
              <CardContent className="grid gap-4 pt-5 md:grid-cols-[1fr_1fr_auto] md:items-end">
                <Field label="الفرز حسب"><NativeSelect className="h-11" value={quranPrintSortKey} onChange={(e) => setQuranPrintSortKey(e.target.value as QuranPrintSortKey)}><option value="name">اسم الموقع</option><option value="total">إجمالي المصاحف</option><option value="large">المصاحف الكبيرة</option><option value="medium">المصاحف المتوسطة</option><option value="small">المصاحف الصغيرة</option><option value="damaged">التالفة</option><option value="needed">الاحتياج</option><option value="last_count">آخر جرد</option></NativeSelect></Field>
                <Field label="اتجاه الفرز"><NativeSelect className="h-11" value={quranPrintSortDirection} onChange={(e) => setQuranPrintSortDirection(e.target.value as QuranPrintSortDirection)}><option value="asc">تصاعدي</option><option value="desc">تنازلي</option></NativeSelect></Field>
                <Button type="button" variant="outline" className={`${button3d} h-11`} onClick={resetQuranPrintFilters}><RefreshCw className="ml-2 h-4 w-4" />إعادة الضبط</Button>
              </CardContent>
            </Card>

            <div className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-7">
              <ReportMetric label="المواقع" value={quranPrintStats.sites} />
              <ReportMetric label="إجمالي المصاحف" value={quranPrintStats.total} />
              <ReportMetric label="الكبيرة" value={quranPrintStats.large} />
              <ReportMetric label="المتوسطة" value={quranPrintStats.medium} />
              <ReportMetric label="الصغيرة" value={quranPrintStats.small} />
              <ReportMetric label="التالفة" value={quranPrintStats.damaged} />
              <ReportMetric label="الاحتياج" value={quranPrintStats.needed} />
            </div>

            <Card className="overflow-hidden border-slate-200 bg-white/95">
              <CardHeader className="gap-2 border-b bg-slate-50/80 pb-3 md:flex-row md:items-center md:justify-between"><div><CardTitle className="text-base">معاينة النتائج</CardTitle><CardDescription>تظهر أول 12 نتيجة فقط هنا، بينما يشمل التقرير جميع النتائج المطابقة.</CardDescription></div><Badge variant="outline" className="w-fit border-sky-200 bg-white">{quranPrintRows.length} موقع مطابق</Badge></CardHeader>
              <CardContent className="p-0">
                {quranPrintRows.length ? <div className="overflow-x-auto"><table className="w-full min-w-[900px] text-sm"><thead className="bg-sky-50 text-slate-700"><tr><th className="p-3 text-right">المسجد / المصلى</th><th className="p-3">النوع</th><th className="p-3">الإجمالي</th><th className="p-3">كبيرة</th><th className="p-3">متوسطة</th><th className="p-3">صغيرة</th><th className="p-3">تالفة</th><th className="p-3">الاحتياج</th><th className="p-3">آخر جرد</th></tr></thead><tbody>{quranPrintRows.slice(0, 12).map((row) => <tr key={row.site.id} className="border-t"><td className="p-3 font-bold text-slate-800">{row.site.name}</td><td className="p-3 text-center">{siteTypeDisplayLabel(row.site)}</td><td className="p-3 text-center text-lg font-black text-emerald-700">{row.total}</td><td className="p-3 text-center">{row.large}</td><td className="p-3 text-center">{row.medium}</td><td className="p-3 text-center">{row.small}</td><td className="p-3 text-center font-bold text-red-600">{row.damaged}</td><td className="p-3 text-center font-bold text-amber-700">{row.needed}</td><td className="p-3 text-center text-xs">{row.latest ? new Date(row.latest.countedAt).toLocaleDateString('ar-SA-u-ca-gregory') : 'لم يجرد'}</td></tr>)}</tbody></table></div> : <div className="p-10"><Empty text="لا توجد نتائج مطابقة لمعايير الطباعة الحالية" /></div>}
              </CardContent>
            </Card>
          </div>
          <DialogFooter className="relative z-20 shrink-0 border-t border-sky-100 bg-white p-4 shadow-[0_-12px_30px_rgba(15,23,42,0.08)] md:px-6">
            <Button variant="outline" className={button3d} onClick={() => setQuranPrintDialog(false)}>إلغاء</Button>
            <Button variant="outline" className={button3d} onClick={resetQuranPrintFilters}><RefreshCw className="ml-2 h-4 w-4" />مسح التصفية</Button>
            <Button className={`min-w-44 ${button3d} bg-sky-700 hover:bg-sky-600`} onClick={printQuranInventory} disabled={!quranPrintRows.length}><Printer className="ml-2 h-4 w-4" />طباعة / حفظ PDF</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

'''
if '<Dialog open={quranPrintDialog}' not in text:
    if dialog_anchor not in text:
        raise SystemExit('Quran dialog anchor not found')
    text = text.replace(dialog_anchor, print_dialog + dialog_anchor, 1)

# Basic verification.
required = [
    'إعداد تقرير المصاحف للطباعة / PDF',
    'quranPrintRows',
    'إعداد الطباعة / PDF',
    'مصليات الرجال',
    'مصليات النساء',
    'حالة الرصيد',
    'الفرز حسب',
]
missing = [item for item in required if item not in text]
if missing:
    raise SystemExit(f'Missing expected print-filter UI markers: {missing}')

path.write_text(text, encoding='utf-8')
print('Added professional Quran print filtering and sorting dialog.')
