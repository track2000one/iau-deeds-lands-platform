from pathlib import Path
import re

path = Path('src/app/pages/MosquesUnitPage.tsx')
text = path.read_text(encoding='utf-8')

anchor = "const siteStatusLabels: Record<string, string> = { active: 'نشط', maintenance: 'تحت الصيانة', temporarily_closed: 'مغلق مؤقتًا' };\n"
insert = anchor + """

type SitePrintColumnKey = 'name' | 'type' | 'building' | 'location' | 'cityDistrict' | 'area' | 'capacity' | 'imam' | 'muezzin' | 'khateeb' | 'contactPhone' | 'coordinates' | 'status' | 'notes';
const SITE_PRINT_COLUMNS: Array<{ key: SitePrintColumnKey; label: string }> = [
  { key: 'name', label: 'الاسم' },
  { key: 'type', label: 'النوع' },
  { key: 'building', label: 'رقم المبنى' },
  { key: 'location', label: 'الموقع داخل الجامعة' },
  { key: 'cityDistrict', label: 'المدينة / الحي' },
  { key: 'area', label: 'المساحة' },
  { key: 'capacity', label: 'الطاقة الاستيعابية' },
  { key: 'imam', label: 'الإمام' },
  { key: 'muezzin', label: 'المؤذن' },
  { key: 'khateeb', label: 'الخطيب' },
  { key: 'contactPhone', label: 'رقم التواصل' },
  { key: 'coordinates', label: 'الإحداثيات' },
  { key: 'status', label: 'الحالة' },
  { key: 'notes', label: 'الملاحظات' },
];
const DEFAULT_SITE_PRINT_COLUMNS: SitePrintColumnKey[] = ['name', 'type', 'building', 'location', 'cityDistrict', 'area', 'imam', 'muezzin', 'status'];
"""
if anchor not in text:
    raise SystemExit('Missing site status anchor')
text = text.replace(anchor, insert, 1)

anchor = "  const [siteSortDirection, setSiteSortDirection] = useState<'asc' | 'desc'>('asc');\n"
insert = anchor + "  const [sitePrintColumns, setSitePrintColumns] = useState<SitePrintColumnKey[]>([...DEFAULT_SITE_PRINT_COLUMNS]);\n"
if anchor not in text:
    raise SystemExit('Missing site sort direction state anchor')
text = text.replace(anchor, insert, 1)

anchor = """  const resetSiteFilters = () => {
    setSearch('');
    setSiteFilterCity('');
    setSiteFilterType('all');
    setSiteFilterStatus('all');
    setSiteSortBy('name');
    setSiteSortDirection('asc');
  };
"""
insert = anchor + """

  const toggleSitePrintColumn = (key: SitePrintColumnKey) => {
    if (sitePrintColumns.includes(key) && sitePrintColumns.length === 1) {
      toast.info('يجب إبقاء عمود واحد على الأقل للطباعة');
      return;
    }
    setSitePrintColumns((current) => current.includes(key) ? current.filter((item) => item !== key) : [...current, key]);
  };

  const selectAllSitePrintColumns = () => setSitePrintColumns(SITE_PRINT_COLUMNS.map((column) => column.key));
  const resetSitePrintColumns = () => setSitePrintColumns([...DEFAULT_SITE_PRINT_COLUMNS]);
"""
if anchor not in text:
    raise SystemExit('Missing reset site filters anchor')
text = text.replace(anchor, insert, 1)

pattern = re.compile(r"  const printSitesTable = \(rows: MosqueSite\[\]\) => \{.*?\n  \};\n\n  const printSiteCard =", re.S)
replacement = r"""  const printSitesTable = (rows: MosqueSite[]) => {
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
      toast.error('تعذر فتح نافذة الطباعة. اسمح بالنوافذ المنبثقة للمنصة ثم أعد المحاولة.');
      return;
    }

    const escapeHtml = (value: unknown) => String(value ?? '').replace(/[&<>"']/g, (char) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;',
    }[char] || char));
    const display = (value: unknown) => value === null || value === undefined || value === '' ? '-' : escapeHtml(value);
    const generatedAt = new Date().toLocaleString('ar-SA-u-ca-gregory');
    const columnValue = (site: MosqueSite, key: SitePrintColumnKey) => {
      const buildingCode = String(site.campusLocation || '').match(/\b(?:M|A|H)\d+\b/i)?.[0]?.toUpperCase() || '-';
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
    const centerColumns = new Set<SitePrintColumnKey>(['type', 'building', 'area', 'capacity', 'contactPhone', 'coordinates', 'status']);
    const tableHeader = selectedColumns.map((column) => `<th class="col-${column.key}">${escapeHtml(column.label)}</th>`).join('');
    const tableRows = rows.map((site, index) => {
      const cells = selectedColumns.map((column) => `<td class="col-${column.key}${column.key === 'name' ? ' name' : ''}${centerColumns.has(column.key) ? ' center' : ''}"${column.key === 'building' || column.key === 'coordinates' || column.key === 'contactPhone' ? ' dir="ltr"' : ''}>${display(columnValue(site, column.key))}</td>`).join('');
      return `<tr><td class="row-number">${index + 1}</td>${cells}</tr>`;
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
    const printFontSize = selectedColumns.length >= 12 ? '5.5px' : selectedColumns.length >= 9 ? '6.2px' : '7px';
    const headerFontSize = selectedColumns.length >= 12 ? '5.7px' : selectedColumns.length >= 9 ? '6.4px' : '7.2px';
    const html = `<!doctype html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>جدول المساجد والمصليات الجامعية</title>
  <style>
    @page { size: A4 landscape; margin: 5mm; }
    * { box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    html, body { margin: 0; padding: 0; background: #fff; color: #172033; font-family: Tahoma, Arial, sans-serif; direction: rtl; }
    body { font-size: ${printFontSize}; line-height: 1.2; }
    .header { margin: 0 0 1.3mm; padding: 0 0 1.2mm; border-bottom: 1.2px solid #0f6f99; }
    .kicker { color: #587083; font-size: 6.2px; margin-bottom: 0.35mm; }
    h1 { margin: 0; color: #102a43; font-size: 13px; line-height: 1.05; }
    .meta { margin-top: 0.45mm; color: #66788a; font-size: 6.2px; display: flex; justify-content: space-between; gap: 2mm; }
    .filters { margin-top: 0.7mm; padding: 0.75mm 1.1mm; border: 1px solid #dbe7ef; border-radius: 1mm; background: #f8fbfd; color: #50677a; font-size: 6.1px; line-height: 1.2; }
    .columns-note { margin-top: 0.55mm; padding: 0.7mm 1.1mm; border: 1px solid #cfe7d9; border-radius: 1mm; background: #f2fbf6; color: #37624b; font-size: 6px; line-height: 1.2; }
    table { width: 100%; border-collapse: collapse; table-layout: auto; }
    thead { display: table-header-group; }
    tr { break-inside: avoid; page-break-inside: avoid; }
    th, td { border: 1px solid #cdd9e3; padding: 0.78mm 0.55mm; vertical-align: middle; text-align: right; line-height: 1.16; word-break: normal; overflow-wrap: anywhere; }
    th { background: #eaf5fb; color: #173a50; font-weight: 900; font-size: ${headerFontSize}; white-space: nowrap; text-align: center; }
    tbody tr:nth-child(even) td { background: #f8fbfd; }
    .row-number { width: 3.2%; min-width: 6mm; text-align: center; font-weight: 800; }
    td.name { font-weight: 800; color: #183b56; }
    td.center { text-align: center; }
    td.col-location, td.col-cityDistrict, td.col-notes { min-width: 22mm; }
    td.col-notes { max-width: 42mm; }
    .footer { margin-top: 1mm; padding-top: 0.8mm; border-top: 1px solid #dce5ec; display: flex; justify-content: space-between; gap: 2mm; color: #718496; font-size: 5.7px; }
  </style>
</head>
<body>
  <header class="header">
    <div class="kicker">جامعة الإمام عبدالرحمن بن فيصل — وحدة العناية بالمساجد والمصليات الجامعية</div>
    <h1>جدول المساجد والمصليات الجامعية</h1>
    <div class="meta"><span>عدد السجلات: ${rows.length}</span><span>تاريخ الاستخراج: ${escapeHtml(generatedAt)}</span></div>
    <div class="filters"><strong>معايير التصفية والفرز:</strong> ${escapeHtml(filterNote || 'جميع السجلات — الفرز حسب الاسم تصاعديًا')}</div>
    <div class="columns-note"><strong>الأعمدة المطبوعة (${selectedColumns.length}):</strong> ${escapeHtml(printedColumnsNote)}</div>
  </header>
  <table>
    <thead><tr><th class="row-number">م</th>${tableHeader}</tr></thead>
    <tbody>${tableRows}</tbody>
  </table>
  <footer class="footer"><span>منصة إدارة الأملاك والأراضي — وحدة العناية بالمساجد والمصليات الجامعية</span><span>يمكن اختيار «حفظ كملف PDF» من نافذة الطباعة.</span></footer>
</body>
</html>`;

    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.onafterprint = () => printWindow.close();
    printWindow.focus();
    window.setTimeout(() => printWindow.print(), 250);
  };

  const printSiteCard ="""
text, count = pattern.subn(lambda _: replacement, text, count=1)
if count != 1:
    raise SystemExit(f'Could not replace printSitesTable function: {count}')

anchor = """                <NativeSelect className=\"h-11 rounded-xl\" value={siteSortBy} onChange={(e) => setSiteSortBy(e.target.value)}><option value=\"name\">فرز حسب الاسم</option><option value=\"building\">فرز حسب رقم المبنى</option><option value=\"city\">فرز حسب المدينة</option><option value=\"type\">فرز حسب النوع</option><option value=\"status\">فرز حسب الحالة</option><option value=\"area\">فرز حسب المساحة</option></NativeSelect>
              </div>

              <div className=\"flex flex-col gap-3 rounded-2xl border border-slate-200 bg-slate-50/70 p-3 lg:flex-row lg:items-center lg:justify-between\">"""
insert = """                <NativeSelect className=\"h-11 rounded-xl\" value={siteSortBy} onChange={(e) => setSiteSortBy(e.target.value)}><option value=\"name\">فرز حسب الاسم</option><option value=\"building\">فرز حسب رقم المبنى</option><option value=\"city\">فرز حسب المدينة</option><option value=\"type\">فرز حسب النوع</option><option value=\"status\">فرز حسب الحالة</option><option value=\"area\">فرز حسب المساحة</option></NativeSelect>
              </div>

              <div className=\"rounded-2xl border border-sky-200/80 bg-gradient-to-l from-sky-50/80 via-white to-emerald-50/60 p-3 sm:p-4\">
                <div className=\"flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between\">
                  <div>
                    <div className=\"flex flex-wrap items-center gap-2\"><Printer className=\"h-4 w-4 text-sky-700\" /><span className=\"text-sm font-black text-slate-800\">أعمدة الطباعة / PDF</span><Badge variant=\"outline\" className=\"border-sky-200 bg-white text-sky-700\">{sitePrintColumns.length} من {SITE_PRINT_COLUMNS.length} محدد</Badge></div>
                    <p className=\"mt-1 text-xs leading-6 text-muted-foreground\">ضع علامة على البيانات التي تريد ظهورها في جدول الطباعة. يبقى رقم التسلسل «م» ظاهرًا تلقائيًا.</p>
                  </div>
                  <div className=\"flex flex-wrap gap-2\">
                    <Button type=\"button\" size=\"sm\" variant=\"outline\" className={button3d} onClick={selectAllSitePrintColumns}>تحديد الكل</Button>
                    <Button type=\"button\" size=\"sm\" variant=\"outline\" className={button3d} onClick={resetSitePrintColumns}>الأعمدة الأساسية</Button>
                  </div>
                </div>
                <div className=\"mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5 xl:grid-cols-7\">
                  {SITE_PRINT_COLUMNS.map((column) => {
                    const checked = sitePrintColumns.includes(column.key);
                    return <label key={column.key} className={`flex cursor-pointer items-center gap-2 rounded-xl border px-3 py-2 text-xs font-semibold transition ${checked ? 'border-sky-300 bg-sky-50 text-sky-800 shadow-sm' : 'border-slate-200 bg-white text-slate-500 hover:border-slate-300'}`}>
                      <input type=\"checkbox\" className=\"h-4 w-4 accent-sky-700\" checked={checked} onChange={() => toggleSitePrintColumn(column.key)} />
                      <span>{column.label}</span>
                    </label>;
                  })}
                </div>
                <div className=\"mt-3 rounded-xl border border-emerald-200 bg-emerald-50/70 px-3 py-2 text-[11px] leading-6 text-emerald-900\"><strong>سيتم طباعة:</strong> {SITE_PRINT_COLUMNS.filter((column) => sitePrintColumns.includes(column.key)).map((column) => column.label).join('، ')}</div>
              </div>

              <div className=\"flex flex-col gap-3 rounded-2xl border border-slate-200 bg-slate-50/70 p-3 lg:flex-row lg:items-center lg:justify-between\">"""
if anchor not in text:
    raise SystemExit('Missing site filter UI anchor')
text = text.replace(anchor, insert, 1)

path.write_text(text, encoding='utf-8')
print('Applied professional mosque print column selector v2')
