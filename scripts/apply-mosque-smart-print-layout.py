from pathlib import Path
import re

path = Path('src/app/pages/MosquesUnitPage.tsx')
text = path.read_text(encoding='utf-8')

# 1) Add print-layout option types and defaults.
anchor = "const DEFAULT_SITE_PRINT_COLUMNS: SitePrintColumnKey[] = ['name', 'type', 'building', 'location', 'cityDistrict', 'area', 'imam', 'muezzin', 'status'];\n"
insert = anchor + """
type SitePrintFontSize = 'auto' | 'small' | 'medium' | 'large';
type SitePrintWidthMode = 'smart' | 'compact' | 'equal';
type SitePrintWrapMode = 'wrap' | 'single';
type SitePrintOrientation = 'auto' | 'landscape' | 'portrait';
"""
if anchor not in text:
    raise SystemExit('Missing print-column defaults anchor')
text = text.replace(anchor, insert, 1)

# 2) Add print-layout states.
anchor = "  const [sitePrintColumns, setSitePrintColumns] = useState<SitePrintColumnKey[]>([...DEFAULT_SITE_PRINT_COLUMNS]);\n"
insert = anchor + """  const [sitePrintFontSize, setSitePrintFontSize] = useState<SitePrintFontSize>('auto');
  const [sitePrintWidthMode, setSitePrintWidthMode] = useState<SitePrintWidthMode>('smart');
  const [sitePrintWrapMode, setSitePrintWrapMode] = useState<SitePrintWrapMode>('wrap');
  const [sitePrintOrientation, setSitePrintOrientation] = useState<SitePrintOrientation>('auto');
"""
if anchor not in text:
    raise SystemExit('Missing sitePrintColumns state anchor')
text = text.replace(anchor, insert, 1)

# 3) Add reset helper for layout settings.
anchor = "  const resetSitePrintColumns = () => setSitePrintColumns([...DEFAULT_SITE_PRINT_COLUMNS]);\n"
insert = anchor + """
  const resetSitePrintLayout = () => {
    setSitePrintFontSize('auto');
    setSitePrintWidthMode('smart');
    setSitePrintWrapMode('wrap');
    setSitePrintOrientation('auto');
  };
"""
if anchor not in text:
    raise SystemExit('Missing resetSitePrintColumns anchor')
text = text.replace(anchor, insert, 1)

# 4) Replace table print renderer with smart layout + preview mode.
pattern = re.compile(r"  const printSitesTable = \(rows: MosqueSite\[\]\) => \{.*?\n  \};\n\n  const printSiteCard =", re.S)
replacement = """  const printSitesTable = (rows: MosqueSite[], mode: 'print' | 'preview' = 'print') => {
    if (!rows.length) {
      toast.info('لا توجد مساجد أو مصليات لطباعتها');
      return;
    }

    const selectedColumns = SITE_PRINT_COLUMNS.filter((column) => sitePrintColumns.includes(column.key));
    if (!selectedColumns.length) {
      toast.info('حدد عمودًا واحدًا على الأقل للطباعة');
      return;
    }

    const printWindow = window.open('', '_blank', 'width=1300,height=900');
    if (!printWindow) {
      toast.error('تعذر فتح نافذة المعاينة/الطباعة. اسمح بالنوافذ المنبثقة للمنصة ثم أعد المحاولة.');
      return;
    }

    const escapeHtml = (value: unknown) => String(value ?? '').replace(/[&<>\"']/g, (char) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '\"': '&quot;', "'": '&#039;',
    }[char] || char));
    const display = (value: unknown) => value === null || value === undefined || value === '' ? '-' : escapeHtml(value);
    const generatedAt = new Date().toLocaleString('ar-SA-u-ca-gregory');
    const columnValue = (site: MosqueSite, key: SitePrintColumnKey) => {
      const buildingCode = String(site.campusLocation || '').match(/\\b(?:M|A|H)\\d+\\b/i)?.[0]?.toUpperCase() || '-';
      const cityDistrict = [site.city, site.district].filter(Boolean).join(' — ') || '-';
      if (key === 'name') return site.name;
      if (key === 'type') return siteTypeLabels[site.siteType] || site.siteType;
      if (key === 'building') return buildingCode;
      if (key === 'location') return site.campusLocation || '-';
      if (key === 'cityDistrict') return cityDistrict;
      if (key === 'area') return site.area ? `${site.area.toLocaleString('ar-SA')} م²` : '-';
      if (key === 'capacity') return site.capacity ? site.capacity.toLocaleString('ar-SA') : '-';
      if (key === 'imam') return site.imamName || '-';
      if (key === 'muezzin') return site.muezzinName || '-';
      if (key === 'khateeb') return site.khateebName || '-';
      if (key === 'contactPhone') return site.contactPhone || '-';
      if (key === 'coordinates') return site.latitude != null && site.longitude != null ? `${site.latitude}, ${site.longitude}` : '-';
      if (key === 'status') return siteStatusLabels[site.status] || site.status;
      if (key === 'notes') return site.notes || '-';
      return '-';
    };

    const compactWeights: Record<SitePrintColumnKey, number> = {
      name: 1.15,
      type: 0.55,
      building: 0.55,
      location: 2.4,
      cityDistrict: 1.5,
      area: 0.65,
      capacity: 0.75,
      imam: 1.05,
      muezzin: 1.05,
      khateeb: 1.05,
      contactPhone: 0.9,
      coordinates: 1.25,
      status: 0.7,
      notes: 2.5,
    };
    const maxColumnTextLength = (key: SitePrintColumnKey, label: string) => Math.max(
      label.length,
      ...rows.slice(0, 120).map((site) => String(columnValue(site, key) ?? '').trim().length)
    );
    const weightForColumn = (key: SitePrintColumnKey, label: string) => {
      if (sitePrintWidthMode === 'equal') return 1;
      const base = compactWeights[key];
      if (sitePrintWidthMode === 'compact') return base;
      const textLength = Math.min(maxColumnTextLength(key, label), 90);
      const lengthFactor = Math.min(1.55, Math.max(0.72, 0.72 + Math.sqrt(textLength) / 10));
      return base * lengthFactor;
    };
    const rowNumberWidth = selectedColumns.length >= 11 ? 2.8 : selectedColumns.length >= 8 ? 3.2 : 3.8;
    const weights = selectedColumns.map((column) => weightForColumn(column.key, column.label));
    const totalWeight = weights.reduce((sum, weight) => sum + weight, 0) || 1;
    const availableWidth = 100 - rowNumberWidth;
    const colgroup = `<col style=\"width:${rowNumberWidth.toFixed(2)}%\" />${selectedColumns.map((column, index) => `<col class=\"col-${column.key}\" style=\"width:${((weights[index] / totalWeight) * availableWidth).toFixed(2)}%\" />`).join('')}`;

    const resolvedOrientation: 'landscape' | 'portrait' = sitePrintOrientation === 'auto'
      ? (selectedColumns.length <= 5 ? 'portrait' : 'landscape')
      : sitePrintOrientation;
    const automaticFont = selectedColumns.length >= 12 ? 5.8 : selectedColumns.length >= 9 ? 6.5 : selectedColumns.length >= 6 ? 7.2 : 8.1;
    const printFontNumber = sitePrintFontSize === 'small' ? 6.1 : sitePrintFontSize === 'medium' ? 7.2 : sitePrintFontSize === 'large' ? 8.4 : automaticFont;
    const printFontSize = `${printFontNumber}px`;
    const headerFontSize = `${printFontNumber + 0.25}px`;
    const tableWidth = sitePrintWidthMode === 'equal'
      ? '100%'
      : selectedColumns.length <= 5
        ? `${Math.min(96, sitePrintWidthMode === 'smart' ? 50 + (selectedColumns.length * 8) : 46 + (selectedColumns.length * 7))}%`
        : '100%';
    const cellWhiteSpace = sitePrintWrapMode === 'single' ? 'nowrap' : 'normal';
    const cellOverflow = sitePrintWrapMode === 'single' ? 'hidden' : 'visible';
    const cellTextOverflow = sitePrintWrapMode === 'single' ? 'ellipsis' : 'clip';
    const cellPadding = selectedColumns.length >= 11 ? '0.62mm 0.42mm' : selectedColumns.length >= 8 ? '0.72mm 0.5mm' : '0.88mm 0.65mm';

    const centerColumns = new Set<SitePrintColumnKey>(['type', 'building', 'area', 'capacity', 'contactPhone', 'coordinates', 'status']);
    const tableHeader = selectedColumns.map((column) => `<th class=\"col-${column.key}\">${escapeHtml(column.label)}</th>`).join('');
    const tableRows = rows.map((site, index) => {
      const cells = selectedColumns.map((column) => `<td class=\"col-${column.key}${column.key === 'name' ? ' name' : ''}${centerColumns.has(column.key) ? ' center' : ''}\"${column.key === 'building' || column.key === 'coordinates' || column.key === 'contactPhone' ? ' dir=\"ltr\"' : ''}>${display(columnValue(site, column.key))}</td>`).join('');
      return `<tr><td class=\"row-number\">${index + 1}</td>${cells}</tr>`;
    }).join('');

    const sortLabels: Record<string, string> = { name: 'الاسم', building: 'رقم المبنى', city: 'المدينة', type: 'النوع', status: 'الحالة', area: 'المساحة' };
    const filterParts = [
      search.trim() ? `بحث: ${search.trim()}` : null,
      siteFilterCity ? `المدينة: ${siteFilterCity}` : null,
      siteFilterType !== 'all' ? `النوع: ${siteTypeLabels[siteFilterType] || siteFilterType}` : null,
      siteFilterStatus !== 'all' ? `الحالة: ${siteStatusLabels[siteFilterStatus] || siteFilterStatus}` : null,
      `الفرز: ${sortLabels[siteSortBy] || siteSortBy} — ${siteSortDirection === 'asc' ? 'تصاعدي' : 'تنازلي'}`,
    ].filter(Boolean) as string[];
    const filterNote = filterParts.join(' | ');
    const printedColumnsNote = selectedColumns.map((column) => column.label).join('، ');
    const fontLabel = sitePrintFontSize === 'auto' ? 'تلقائي' : sitePrintFontSize === 'small' ? 'صغير' : sitePrintFontSize === 'medium' ? 'متوسط' : 'كبير';
    const widthLabel = sitePrintWidthMode === 'smart' ? 'ذكي تلقائي' : sitePrintWidthMode === 'compact' ? 'مضغوط' : 'متساوٍ';
    const wrapLabel = sitePrintWrapMode === 'wrap' ? 'التفاف تلقائي' : 'سطر واحد';
    const orientationLabel = sitePrintOrientation === 'auto' ? `تلقائي (${resolvedOrientation === 'portrait' ? 'عمودي' : 'أفقي'})` : resolvedOrientation === 'portrait' ? 'عمودي' : 'أفقي';
    const previewToolbar = mode === 'preview' ? `
      <div class=\"preview-toolbar\">
        <div><strong>معاينة التقرير</strong><span>راجع توزيع الأعمدة وحجم الخط قبل الطباعة.</span></div>
        <div class=\"preview-actions\"><button type=\"button\" onclick=\"window.print()\">طباعة / حفظ PDF</button><button type=\"button\" class=\"secondary\" onclick=\"window.close()\">إغلاق</button></div>
      </div>` : '';
    const html = `<!doctype html>
<html lang=\"ar\" dir=\"rtl\">
<head>
  <meta charset=\"utf-8\" />
  <meta name=\"viewport\" content=\"width=device-width,initial-scale=1\" />
  <title>جدول المساجد والمصليات الجامعية</title>
  <style>
    @page { size: A4 ${resolvedOrientation}; margin: 5mm; }
    * { box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    html, body { margin: 0; padding: 0; background: #fff; color: #172033; font-family: Tahoma, Arial, sans-serif; direction: rtl; }
    body { font-size: ${printFontSize}; line-height: 1.2; }
    .preview-toolbar { position: sticky; top: 0; z-index: 20; margin: 0 0 4mm; padding: 10px 14px; border: 1px solid #bae6fd; border-radius: 12px; background: rgba(240,249,255,.96); box-shadow: 0 8px 24px rgba(15,23,42,.10); display: flex; align-items: center; justify-content: space-between; gap: 12px; font-size: 12px; }
    .preview-toolbar strong { display: block; color: #0c4a6e; font-size: 14px; }
    .preview-toolbar span { display: block; margin-top: 3px; color: #64748b; }
    .preview-actions { display: flex; gap: 8px; }
    .preview-actions button { border: 0; border-radius: 9px; padding: 8px 13px; background: #0369a1; color: #fff; font: inherit; font-weight: 700; cursor: pointer; }
    .preview-actions button.secondary { border: 1px solid #cbd5e1; background: #fff; color: #334155; }
    .header { margin: 0 0 1.3mm; padding: 0 0 1.2mm; border-bottom: 1.2px solid #0f6f99; }
    .kicker { color: #587083; font-size: 6.2px; margin-bottom: 0.35mm; }
    h1 { margin: 0; color: #102a43; font-size: 13px; line-height: 1.05; }
    .meta { margin-top: 0.45mm; color: #66788a; font-size: 6.2px; display: flex; justify-content: space-between; gap: 2mm; }
    .filters { margin-top: 0.7mm; padding: 0.75mm 1.1mm; border: 1px solid #dbe7ef; border-radius: 1mm; background: #f8fbfd; color: #50677a; font-size: 6.1px; line-height: 1.2; }
    .columns-note, .layout-note { margin-top: 0.55mm; padding: 0.7mm 1.1mm; border-radius: 1mm; font-size: 6px; line-height: 1.2; }
    .columns-note { border: 1px solid #cfe7d9; background: #f2fbf6; color: #37624b; }
    .layout-note { border: 1px solid #dbeafe; background: #eff6ff; color: #365b7a; }
    table { width: ${tableWidth}; margin: 0 auto; border-collapse: collapse; table-layout: fixed; }
    thead { display: table-header-group; }
    tr { break-inside: avoid; page-break-inside: avoid; }
    th, td { border: 1px solid #cdd9e3; padding: ${cellPadding}; vertical-align: middle; text-align: right; line-height: 1.16; word-break: normal; overflow-wrap: ${sitePrintWrapMode === 'wrap' ? 'anywhere' : 'normal'}; white-space: ${cellWhiteSpace}; overflow: ${cellOverflow}; text-overflow: ${cellTextOverflow}; }
    th { background: #eaf5fb; color: #173a50; font-weight: 900; font-size: ${headerFontSize}; white-space: nowrap; text-align: center; }
    tbody tr:nth-child(even) td { background: #f8fbfd; }
    .row-number { text-align: center; font-weight: 800; }
    td.name { font-weight: 800; color: #183b56; }
    td.center { text-align: center; }
    .footer { margin-top: 1mm; padding-top: 0.8mm; border-top: 1px solid #dce5ec; display: flex; justify-content: space-between; gap: 2mm; color: #718496; font-size: 5.7px; }
    @media print { .preview-toolbar { display: none !important; } }
  </style>
</head>
<body>
  ${previewToolbar}
  <header class=\"header\">
    <div class=\"kicker\">جامعة الإمام عبدالرحمن بن فيصل — وحدة العناية بالمساجد والمصليات الجامعية</div>
    <h1>جدول المساجد والمصليات الجامعية</h1>
    <div class=\"meta\"><span>عدد السجلات: ${rows.length}</span><span>تاريخ الاستخراج: ${escapeHtml(generatedAt)}</span></div>
    <div class=\"filters\"><strong>معايير التصفية والفرز:</strong> ${escapeHtml(filterNote || 'جميع السجلات — الفرز حسب الاسم تصاعديًا')}</div>
    <div class=\"columns-note\"><strong>الأعمدة المطبوعة (${selectedColumns.length}):</strong> ${escapeHtml(printedColumnsNote)}</div>
    <div class=\"layout-note\"><strong>تنسيق التقرير:</strong> الخط ${escapeHtml(fontLabel)} — الأعمدة ${escapeHtml(widthLabel)} — النص ${escapeHtml(wrapLabel)} — الصفحة ${escapeHtml(orientationLabel)}</div>
  </header>
  <table>
    <colgroup>${colgroup}</colgroup>
    <thead><tr><th class=\"row-number\">م</th>${tableHeader}</tr></thead>
    <tbody>${tableRows}</tbody>
  </table>
  <footer class=\"footer\"><span>منصة إدارة الأملاك والأراضي — وحدة العناية بالمساجد والمصليات الجامعية</span><span>يمكن اختيار «حفظ كملف PDF» من نافذة الطباعة.</span></footer>
</body>
</html>`;

    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.focus();
    if (mode === 'print') {
      printWindow.onafterprint = () => printWindow.close();
      window.setTimeout(() => printWindow.print(), 250);
    }
  };

  const printSiteCard ="""
text, count = pattern.subn(lambda _: replacement, text, count=1)
if count != 1:
    raise SystemExit(f'Could not replace printSitesTable function: {count}')

# 5) Add preview button next to print action.
old = """                  <Button variant=\"outline\" className={button3d} onClick={resetSiteFilters}><X className=\"ml-2 h-4 w-4\" />مسح التصفية</Button>
                  {canPrint && visibleSites.length > 0 && <Button className={`${button3d} bg-sky-700 hover:bg-sky-800`} onClick={() => printSitesTable(visibleSites)}><Printer className=\"ml-2 h-4 w-4\" />طباعة / PDF كجدول ({visibleSites.length})</Button>}
"""
new = """                  <Button variant=\"outline\" className={button3d} onClick={resetSiteFilters}><X className=\"ml-2 h-4 w-4\" />مسح التصفية</Button>
                  {canPrint && visibleSites.length > 0 && <Button variant=\"outline\" className={button3d} onClick={() => printSitesTable(visibleSites, 'preview')}><Eye className=\"ml-2 h-4 w-4\" />معاينة التقرير</Button>}
                  {canPrint && visibleSites.length > 0 && <Button className={`${button3d} bg-sky-700 hover:bg-sky-800`} onClick={() => printSitesTable(visibleSites, 'print')}><Printer className=\"ml-2 h-4 w-4\" />طباعة / PDF كجدول ({visibleSites.length})</Button>}
"""
if old not in text:
    raise SystemExit('Missing print action block')
text = text.replace(old, new, 1)

# 6) Insert professional print-format controls after print-column chooser.
anchor = """                <div className=\"mt-3 rounded-xl border border-emerald-200 bg-emerald-50/70 px-3 py-2 text-[11px] leading-6 text-emerald-900\"><strong>سيتم طباعة:</strong> {SITE_PRINT_COLUMNS.filter((column) => sitePrintColumns.includes(column.key)).map((column) => column.label).join('، ')}</div>
              </div>

              <div className=\"flex flex-col gap-3 rounded-2xl border border-slate-200 bg-slate-50/70 p-3 lg:flex-row lg:items-center lg:justify-between\">"""
insert = """                <div className=\"mt-3 rounded-xl border border-emerald-200 bg-emerald-50/70 px-3 py-2 text-[11px] leading-6 text-emerald-900\"><strong>سيتم طباعة:</strong> {SITE_PRINT_COLUMNS.filter((column) => sitePrintColumns.includes(column.key)).map((column) => column.label).join('، ')}</div>
              </div>

              <div className=\"rounded-2xl border border-indigo-200/80 bg-gradient-to-l from-indigo-50/70 via-white to-sky-50/60 p-3 sm:p-4\">
                <div className=\"flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between\">
                  <div>
                    <div className=\"flex flex-wrap items-center gap-2\"><Printer className=\"h-4 w-4 text-indigo-700\" /><span className=\"text-sm font-black text-slate-800\">تنسيق الطباعة الذكي</span><Badge variant=\"outline\" className=\"border-indigo-200 bg-white text-indigo-700\">يتكيف مع محتوى الحقول</Badge></div>
                    <p className=\"mt-1 text-xs leading-6 text-muted-foreground\">الوضع الذكي يمنح الحقول القصيرة مساحة أقل ويعطي الموقع والملاحظات مساحة أكبر، مع إمكانية التحكم اليدوي عند الحاجة.</p>
                  </div>
                  <Button type=\"button\" size=\"sm\" variant=\"outline\" className={button3d} onClick={resetSitePrintLayout}>إعادة التنسيق التلقائي</Button>
                </div>
                <div className=\"mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4\">
                  <div><Label className=\"mb-1.5 block text-xs font-bold text-slate-600\">حجم الخط</Label><NativeSelect className=\"h-10 rounded-xl bg-white\" value={sitePrintFontSize} onChange={(e) => setSitePrintFontSize(e.target.value as SitePrintFontSize)}><option value=\"auto\">تلقائي حسب عدد الأعمدة</option><option value=\"small\">صغير</option><option value=\"medium\">متوسط</option><option value=\"large\">كبير</option></NativeSelect></div>
                  <div><Label className=\"mb-1.5 block text-xs font-bold text-slate-600\">مساحة الأعمدة</Label><NativeSelect className=\"h-10 rounded-xl bg-white\" value={sitePrintWidthMode} onChange={(e) => setSitePrintWidthMode(e.target.value as SitePrintWidthMode)}><option value=\"smart\">تلقائي ذكي حسب المحتوى</option><option value=\"compact\">مضغوط</option><option value=\"equal\">متساوٍ</option></NativeSelect></div>
                  <div><Label className=\"mb-1.5 block text-xs font-bold text-slate-600\">عرض النص داخل الحقل</Label><NativeSelect className=\"h-10 rounded-xl bg-white\" value={sitePrintWrapMode} onChange={(e) => setSitePrintWrapMode(e.target.value as SitePrintWrapMode)}><option value=\"wrap\">التفاف تلقائي للنص</option><option value=\"single\">سطر واحد</option></NativeSelect></div>
                  <div><Label className=\"mb-1.5 block text-xs font-bold text-slate-600\">اتجاه الصفحة</Label><NativeSelect className=\"h-10 rounded-xl bg-white\" value={sitePrintOrientation} onChange={(e) => setSitePrintOrientation(e.target.value as SitePrintOrientation)}><option value=\"auto\">تلقائي حسب عدد الأعمدة</option><option value=\"landscape\">أفقي</option><option value=\"portrait\">عمودي</option></NativeSelect></div>
                </div>
                <div className=\"mt-3 flex flex-wrap items-center gap-2 rounded-xl border border-sky-200 bg-sky-50/70 px-3 py-2 text-[11px] leading-6 text-sky-900\"><strong>التنسيق الحالي:</strong><span>الخط: {sitePrintFontSize === 'auto' ? 'تلقائي' : sitePrintFontSize === 'small' ? 'صغير' : sitePrintFontSize === 'medium' ? 'متوسط' : 'كبير'}</span><span>•</span><span>الأعمدة: {sitePrintWidthMode === 'smart' ? 'ذكية حسب المحتوى' : sitePrintWidthMode === 'compact' ? 'مضغوطة' : 'متساوية'}</span><span>•</span><span>النص: {sitePrintWrapMode === 'wrap' ? 'التفاف' : 'سطر واحد'}</span><span>•</span><span>الصفحة: {sitePrintOrientation === 'auto' ? 'تلقائية' : sitePrintOrientation === 'portrait' ? 'عمودية' : 'أفقية'}</span></div>
              </div>

              <div className=\"flex flex-col gap-3 rounded-2xl border border-slate-200 bg-slate-50/70 p-3 lg:flex-row lg:items-center lg:justify-between\">"""
if anchor not in text:
    raise SystemExit('Missing print-column selector insertion anchor')
text = text.replace(anchor, insert, 1)

path.write_text(text, encoding='utf-8')
print('Applied smart mosque print layout successfully')
