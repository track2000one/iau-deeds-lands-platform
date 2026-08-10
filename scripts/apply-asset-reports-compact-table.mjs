import fs from 'node:fs';

const filePath = 'src/app/pages/AssetReportsPage.tsx';
let source = fs.readFileSync(filePath, 'utf8');

// Preserve the previously approved compact single-asset print layout when applying this patch.
const oldCss = `@page{size:A4 portrait;margin:10mm}*{box-sizing:border-box}body{font-family:Tahoma,Arial,sans-serif;color:#172033;margin:0}.head{text-align:center;border-top:4px solid #1f4e79;border-bottom:1px solid #dbe3ec;padding:12px;margin-bottom:10px}.head h1{font-size:20px;margin:0}.head p{font-size:11px;color:#64748b;margin:4px}.title{font-size:16px;font-weight:800;color:#1f4e79;margin-top:8px}.grid{display:grid;grid-template-columns:repeat(3,1fr);gap:7px}.field{border:1px solid #dbe3ec;border-radius:9px;padding:8px;min-height:52px}.label{font-size:9px;color:#64748b}.value{font-size:11px;font-weight:700;margin-top:4px;overflow-wrap:anywhere}.photos{display:grid;grid-template-columns:repeat(2,1fr);gap:8px;margin-top:12px}figure{margin:0;border:1px solid #dbe3ec;border-radius:10px;padding:6px;break-inside:avoid}figure img{width:100%;height:85mm;object-fit:contain;background:#f8fafc}figcaption{text-align:center;font-size:8px;color:#64748b;margin-top:4px}.empty{grid-column:1/-1;border:1px dashed #cbd5e1;border-radius:10px;padding:20px;text-align:center;color:#64748b}.foot{margin-top:12px;border-top:1px solid #dbe3ec;padding-top:7px;font-size:8px;color:#64748b;display:flex;justify-content:space-between}@media print{body{print-color-adjust:exact;-webkit-print-color-adjust:exact}}`;

const newCss = `@page{size:A4 portrait;margin:7mm}*{box-sizing:border-box}html{background:#eef2f6;padding:1px 0}body{font-family:Tahoma,Arial,sans-serif;color:#172033;width:calc(100% - 24px);max-width:190mm;min-height:270mm;margin:12px auto;background:#fff;border:1px solid #d7e0ea;box-shadow:0 12px 32px rgba(15,23,42,.10);display:flex;flex-direction:column}.head{text-align:center;border-top:4px solid #1f4e79;border-bottom:1px solid #d7e0ea;padding:8px 10px 7px;margin-bottom:7px}.head h1{font-size:18px;line-height:1.15;margin:0;font-weight:800;color:#10233f}.head p{font-size:9px;line-height:1.2;color:#64748b;margin:2px 0 0}.title{font-size:14px;line-height:1.2;font-weight:800;color:#1f4e79;margin-top:4px}.grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:5px;padding:0 8px}.field{border:1px solid #d9e2ec;border-radius:6px;padding:5px 7px;min-height:38px;background:#fff;break-inside:avoid}.field:nth-child(3),.field:nth-child(7){grid-column:1/-1}.label{font-size:8px;line-height:1.1;color:#718096}.value{font-size:11px;line-height:1.25;font-weight:700;margin-top:3px;color:#10233f;overflow-wrap:anywhere}.photos{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:6px;margin-top:8px;padding:0 8px}figure{margin:0;border:1px solid #d9e2ec;border-radius:6px;padding:5px;break-inside:avoid;background:#fff}figure img{display:block;width:100%;height:74mm;object-fit:contain;background:#f8fafc}figcaption{text-align:center;font-size:8px;line-height:1.2;color:#64748b;margin-top:4px}.empty{grid-column:1/-1;border:1px dashed #b9c8d8;border-radius:6px;padding:14px 8px;text-align:center;color:#64748b;background:#fbfdff;font-size:10px}.foot{margin-top:auto;border-top:1px solid #d9e2ec;padding:5px 8px;font-size:7.5px;line-height:1.2;color:#64748b;display:flex;justify-content:space-between;gap:12px}@media(max-width:760px){body{width:calc(100% - 12px);margin:6px auto;min-height:auto}.grid{grid-template-columns:1fr}.field:nth-child(3),.field:nth-child(7){grid-column:auto}.photos{grid-template-columns:1fr}}@media print{html{background:#fff;padding:0}body{width:100%;max-width:none;min-height:calc(297mm - 14mm);margin:0;border:0;box-shadow:none;print-color-adjust:exact;-webkit-print-color-adjust:exact}.head{padding:3.5mm 4mm 3mm;margin-bottom:3mm}.grid{padding:0 5mm;gap:2mm}.photos{padding:0 5mm;margin-top:3mm;gap:2mm}.foot{padding:2mm 5mm}}`;

if (source.includes(oldCss)) {
  source = source.replace(oldCss, newCss);
}

// Add report-heading configuration shared by the asset tabular report.
if (!source.includes('ASSET_REPORT_SETTINGS_STORAGE_KEY')) {
  const valueForAnchor = 'const valueFor = (asset: ReportAsset, key: FieldKey) => {';
  if (!source.includes(valueForAnchor)) throw new Error('Could not locate valueFor anchor');
  const settingsConstants = `const ASSET_REPORT_SETTINGS_STORAGE_KEY = 'iau-asset-report-settings';\n\ntype AssetReportSettings = {\n  universityName: string;\n  departmentName: string;\n  reportTitle: string;\n  statementTitle: string;\n};\n\nconst DEFAULT_ASSET_REPORT_SETTINGS: AssetReportSettings = {\n  universityName: 'جامعة الإمام عبدالرحمن بن فيصل',\n  departmentName: 'الإدارة العامة للأصول والأملاك والأوقاف الجامعية',\n  reportTitle: 'تقرير الأصول',\n  statementTitle: 'بيان الأصول',\n};\n\nconst safeSheetName = (value: string) => {\n  const invalid = ['\\\\', '/', '?', '*', '[', ']', ':'];\n  const sanitized = invalid.reduce((name, char) => name.split(char).join('-'), value.trim());\n  return (sanitized || 'الأصول').slice(0, 31);\n};\n\n`;
  source = source.replace(valueForAnchor, settingsConstants + valueForAnchor);
}

if (!source.includes('const [reportSettings, setReportSettings]')) {
  const stateAnchor = "  const [officialExcelMessage, setOfficialExcelMessage] = useState('');";
  if (!source.includes(stateAnchor)) throw new Error('Could not locate asset report state anchor');
  const settingsState = `\n  const [reportSettings, setReportSettings] = useState<AssetReportSettings>(() => {\n    try {\n      const raw = window.localStorage.getItem(ASSET_REPORT_SETTINGS_STORAGE_KEY);\n      if (!raw) return { ...DEFAULT_ASSET_REPORT_SETTINGS };\n      const saved = JSON.parse(raw) as Partial<AssetReportSettings>;\n      return { ...DEFAULT_ASSET_REPORT_SETTINGS, ...saved };\n    } catch {\n      return { ...DEFAULT_ASSET_REPORT_SETTINGS };\n    }\n  });`;
  source = source.replace(stateAnchor, stateAnchor + settingsState);
}

if (!source.includes("window.localStorage.setItem(ASSET_REPORT_SETTINGS_STORAGE_KEY")) {
  const effectAnchor = `  useEffect(() => {\n    const timer = window.setTimeout(() => setDebouncedQuery(query.trim()), 320);`;
  if (!source.includes(effectAnchor)) throw new Error('Could not locate asset report effect anchor');
  const persistenceEffect = `  useEffect(() => {\n    try {\n      window.localStorage.setItem(ASSET_REPORT_SETTINGS_STORAGE_KEY, JSON.stringify(reportSettings));\n    } catch {\n      // Ignore storage restrictions; report controls still work for the current session.\n    }\n  }, [reportSettings]);\n\n`;
  source = source.replace(effectAnchor, persistenceEffect + effectAnchor);
}

// Use the manually selected statement/table title in the regular Excel export sheet name.
source = source.replace(
  "      XLSX.utils.book_append_sheet(book, sheet, activeGroup?.label?.slice(0, 31) || 'الأصول');",
  "      XLSX.utils.book_append_sheet(book, sheet, safeSheetName(reportSettings.statementTitle || activeGroup?.label || 'الأصول'));",
);

// Apply the manual report headings to the printable tabular report.
source = source.replace(
  '<title>تقرير الأصول</title>',
  "<title>${escapeHtml(reportSettings.reportTitle || 'تقرير الأصول')}</title>",
);

const oldHeader = '      <div class="header"><h1>جامعة الإمام عبدالرحمن بن فيصل</h1><div class="sub">الإدارة العامة للأصول والأملاك والأوقاف الجامعية</div><div class="sub">تقرير الأصول — ${escapeHtml(groupLabel)}</div></div>';
const newHeader = '      <div class="header"><h1>${escapeHtml(reportSettings.universityName || DEFAULT_ASSET_REPORT_SETTINGS.universityName)}</h1><div class="sub">${escapeHtml(reportSettings.departmentName || DEFAULT_ASSET_REPORT_SETTINGS.departmentName)}</div><div class="sub">${escapeHtml(reportSettings.reportTitle || DEFAULT_ASSET_REPORT_SETTINGS.reportTitle)}</div></div>';
if (source.includes(oldHeader)) source = source.replace(oldHeader, newHeader);

if (!source.includes('.statement-title{')) {
  const cssAnchor = '.summary strong{font-size:12px}table{width:100%;';
  if (!source.includes(cssAnchor)) throw new Error('Could not locate tabular print CSS anchor');
  source = source.replace(
    cssAnchor,
    '.summary strong{font-size:12px}.statement-title{text-align:center;padding:2px 4px;border-right:1px solid #dbe3ec;border-left:1px solid #dbe3ec;font-size:11px;font-weight:800;line-height:1.1;color:#172033;background:#fff}table{width:100%;',
  );
}

if (!source.includes('class="statement-title"')) {
  const tableAnchor = '      <table>${colgroup}<thead><tr><th>#</th>${headers}</tr></thead>';
  if (!source.includes(tableAnchor)) throw new Error('Could not locate printable table anchor');
  source = source.replace(
    tableAnchor,
    '      <div class="statement-title">${escapeHtml(reportSettings.statementTitle.trim() || DEFAULT_ASSET_REPORT_SETTINGS.statementTitle)}</div>\n      <table>${colgroup}<thead><tr><th>#</th>${headers}</tr></thead>',
  );
}

// Add a compact controls card similar to the deed report settings.
if (!source.includes('إعدادات عنوان التقرير والبيان')) {
  const columnsCard = '      <Card className="rounded-[28px] border-white/55 bg-white/70 shadow-sm"><CardHeader className="border-b bg-white/40"><CardTitle>اختيار أعمدة التقرير</CardTitle></CardHeader>';
  if (!source.includes(columnsCard)) throw new Error('Could not locate report columns card');
  const controlsCard = `      <Card className="rounded-[28px] border-white/55 bg-white/70 shadow-sm">\n        <CardHeader className="flex flex-row items-center justify-between gap-3 border-b bg-white/40">\n          <div>\n            <CardTitle>إعدادات عنوان التقرير والبيان</CardTitle>\n            <p className="mt-1 text-xs text-muted-foreground">تحكم يدوي بمسمى التقرير واسم البيان أو الجدول، على غرار إعدادات تقارير الصكوك.</p>\n          </div>\n          <Button type="button" variant="outline" size="sm" onClick={()=>setReportSettings({ ...DEFAULT_ASSET_REPORT_SETTINGS })}>استعادة الإعدادات</Button>\n        </CardHeader>\n        <CardContent className="grid grid-cols-1 gap-3 p-5 sm:grid-cols-2 sm:p-6 xl:grid-cols-4">\n          <label className="space-y-1.5"><span className="text-xs font-bold text-muted-foreground">عنوان التقرير</span><Input value={reportSettings.reportTitle} onChange={(e)=>setReportSettings((current)=>({ ...current, reportTitle:e.target.value }))} placeholder="مثال: تقرير الأصول"/></label>\n          <label className="space-y-1.5"><span className="text-xs font-bold text-muted-foreground">اسم البيان / الجدول</span><Input value={reportSettings.statementTitle} onChange={(e)=>setReportSettings((current)=>({ ...current, statementTitle:e.target.value }))} placeholder="مثال: بيان الأصول والأثاث"/></label>\n          <label className="space-y-1.5"><span className="text-xs font-bold text-muted-foreground">اسم الجامعة</span><Input value={reportSettings.universityName} onChange={(e)=>setReportSettings((current)=>({ ...current, universityName:e.target.value }))}/></label>\n          <label className="space-y-1.5"><span className="text-xs font-bold text-muted-foreground">اسم الجهة</span><Input value={reportSettings.departmentName} onChange={(e)=>setReportSettings((current)=>({ ...current, departmentName:e.target.value }))}/></label>\n        </CardContent>\n      </Card>\n\n`;
  source = source.replace(columnsCard, controlsCard + columnsCard);
}

// Show the chosen statement/table name above the on-screen data table as immediate visual feedback.
if (!source.includes('reportSettings.statementTitle.trim() || DEFAULT_ASSET_REPORT_SETTINGS.statementTitle}</div>{loading?')) {
  const tableCardAnchor = '<Card className="overflow-hidden rounded-[20px] border-white/55 bg-white/70 shadow-[0_12px_36px_rgba(15,23,42,0.06)] backdrop-blur-xl"><CardContent className="p-0">{loading?';
  if (!source.includes(tableCardAnchor)) throw new Error('Could not locate asset report screen table card');
  source = source.replace(
    tableCardAnchor,
    '<Card className="overflow-hidden rounded-[20px] border-white/55 bg-white/70 shadow-[0_12px_36px_rgba(15,23,42,0.06)] backdrop-blur-xl"><CardContent className="p-0"><div className="border-b bg-white/45 px-3 py-2 text-center text-sm font-black">{reportSettings.statementTitle.trim() || DEFAULT_ASSET_REPORT_SETTINGS.statementTitle}</div>{loading?',
  );
}

fs.writeFileSync(filePath, source, 'utf8');
console.log('Asset report manual title and statement controls applied successfully.');
