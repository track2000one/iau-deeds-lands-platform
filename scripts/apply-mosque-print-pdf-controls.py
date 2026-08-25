from pathlib import Path

path = Path('src/app/pages/MosquesUnitPage.tsx')
text = path.read_text(encoding='utf-8')

function_anchor = "  const publicUrlForSite = (site: MosqueSite) => `${window.location.origin}${window.location.pathname}#/mosques/public?site=${encodeURIComponent(site.publicToken)}`;\n\n  const printSiteCard = async (site: MosqueSite) => {"
if function_anchor not in text:
    raise SystemExit('print function anchor not found')

print_table_function = r'''  const publicUrlForSite = (site: MosqueSite) => `${window.location.origin}${window.location.pathname}#/mosques/public?site=${encodeURIComponent(site.publicToken)}`;

  const printSitesTable = (rows: MosqueSite[]) => {
    if (!rows.length) {
      toast.info('لا توجد مساجد أو مصليات لطباعتها');
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
    const tableRows = rows.map((site, index) => {
      const buildingCode = String(site.campusLocation || '').match(/\b(?:M|A|H)\d+\b/i)?.[0]?.toUpperCase() || '-';
      const universityLocation = site.campusLocation || '-';
      const cityDistrict = [site.city, site.district].filter(Boolean).join(' — ') || '-';
      const area = site.area ? `${site.area.toLocaleString('ar-SA')} م²` : '-';
      return `<tr>
        <td>${index + 1}</td>
        <td class="name">${display(site.name)}</td>
        <td>${display(siteTypeLabels[site.siteType] || site.siteType)}</td>
        <td dir="ltr">${display(buildingCode)}</td>
        <td>${display(universityLocation)}</td>
        <td>${display(cityDistrict)}</td>
        <td>${display(area)}</td>
        <td>${display(site.imamName || '-')}</td>
        <td>${display(site.muezzinName || '-')}</td>
        <td>${display(siteStatusLabels[site.status] || site.status)}</td>
      </tr>`;
    }).join('');

    const filterNote = search.trim() ? ' — نتائج البحث/التصفية الحالية' : '';
    const html = `<!doctype html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>جدول المساجد والمصليات الجامعية</title>
  <style>
    @page { size: A4 landscape; margin: 9mm; }
    * { box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    html, body { margin: 0; padding: 0; background: #fff; color: #172033; font-family: Tahoma, Arial, sans-serif; direction: rtl; }
    body { font-size: 9px; }
    .header { margin-bottom: 5mm; padding-bottom: 4mm; border-bottom: 2px solid #0f6f99; }
    .kicker { color: #587083; font-size: 9px; margin-bottom: 1.5mm; }
    h1 { margin: 0; color: #102a43; font-size: 19px; }
    .meta { margin-top: 2mm; color: #66788a; font-size: 8px; display: flex; justify-content: space-between; gap: 5mm; }
    table { width: 100%; border-collapse: collapse; table-layout: fixed; }
    thead { display: table-header-group; }
    tr { break-inside: avoid; page-break-inside: avoid; }
    th, td { border: 1px solid #cdd9e3; padding: 2.2mm 1.6mm; vertical-align: middle; text-align: right; line-height: 1.55; word-break: break-word; }
    th { background: #eaf5fb; color: #173a50; font-weight: 900; font-size: 8px; }
    tbody tr:nth-child(even) td { background: #f8fbfd; }
    td:first-child, th:first-child { width: 4%; text-align: center; }
    th:nth-child(2) { width: 14%; }
    th:nth-child(3) { width: 7%; }
    th:nth-child(4) { width: 7%; }
    th:nth-child(5) { width: 17%; }
    th:nth-child(6) { width: 13%; }
    th:nth-child(7) { width: 8%; }
    th:nth-child(8), th:nth-child(9) { width: 11%; }
    th:nth-child(10) { width: 8%; }
    td.name { font-weight: 800; color: #183b56; }
    .footer { margin-top: 4mm; padding-top: 2.5mm; border-top: 1px solid #dce5ec; display: flex; justify-content: space-between; gap: 4mm; color: #718496; font-size: 7px; }
  </style>
</head>
<body>
  <header class="header">
    <div class="kicker">جامعة الإمام عبدالرحمن بن فيصل — وحدة العناية بالمساجد والمصليات الجامعية</div>
    <h1>جدول المساجد والمصليات الجامعية</h1>
    <div class="meta"><span>عدد السجلات: ${rows.length}${filterNote}</span><span>تاريخ الاستخراج: ${escapeHtml(generatedAt)}</span></div>
  </header>
  <table>
    <thead><tr><th>م</th><th>الاسم</th><th>النوع</th><th>رقم المبنى</th><th>الموقع داخل الجامعة</th><th>المدينة / الحي</th><th>المساحة</th><th>الإمام</th><th>المؤذن</th><th>الحالة</th></tr></thead>
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

  const printSiteCard = async (site: MosqueSite) => {'''
text = text.replace(function_anchor, print_table_function, 1)

sites_anchor = '''        <TabsContent value="sites" className="space-y-4">
          <Card className={card3d}><CardContent className="p-4"><div className="relative"><Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input className="pr-9" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="بحث باسم المسجد أو المدينة أو الحي أو الموقع..." /></div></CardContent></Card>
          {visibleSites.length === 0 ? <Empty text="لا توجد مساجد أو مصليات مسجلة" /> : <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">{visibleSites.map((site) => <SiteCard key={site.id} site={site} canEdit={canEdit && ['head', 'supervisor'].includes(role)} canDelete={canDelete && role === 'head'} onPreview={() => setPreviewSite(site)} onEdit={() => openSiteDialog(site)} onDelete={() => deleteSite(site)} onQr={() => setQrSite(site)} />)}</div>}
        </TabsContent>'''

sites_replacement = '''        <TabsContent value="sites" className="space-y-4">
          <Card className={card3d}><CardContent className="p-4"><div className="flex flex-col gap-3 lg:flex-row lg:items-center"><div className="relative flex-1"><Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input className="pr-9" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="بحث باسم المسجد أو المدينة أو الحي أو الموقع..." /></div>{canPrint && visibleSites.length > 0 && <Button variant="outline" className={`${button3d} shrink-0`} onClick={() => printSitesTable(visibleSites)}><Printer className="ml-2 h-4 w-4" />طباعة / PDF كجدول</Button>}</div></CardContent></Card>
          {visibleSites.length === 0 ? <Empty text="لا توجد مساجد أو مصليات مسجلة" /> : <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">{visibleSites.map((site) => <SiteCard key={site.id} site={site} canEdit={canEdit && ['head', 'supervisor'].includes(role)} canDelete={canDelete && role === 'head'} canPrint={canPrint} onPreview={() => setPreviewSite(site)} onPrint={() => void printSiteCard(site)} onEdit={() => openSiteDialog(site)} onDelete={() => deleteSite(site)} onQr={() => setQrSite(site)} />)}</div>}
        </TabsContent>'''

if sites_anchor not in text:
    raise SystemExit('sites tab anchor not found')
text = text.replace(sites_anchor, sites_replacement, 1)

signature_anchor = "const SiteCard = ({ site, canEdit, canDelete, onPreview, onEdit, onDelete, onQr }: { site: MosqueSite; canEdit: boolean; canDelete: boolean; onPreview: () => void; onEdit: () => void; onDelete: () => void; onQr: () => void }) =>"
signature_replacement = "const SiteCard = ({ site, canEdit, canDelete, canPrint, onPreview, onPrint, onEdit, onDelete, onQr }: { site: MosqueSite; canEdit: boolean; canDelete: boolean; canPrint: boolean; onPreview: () => void; onPrint: () => void; onEdit: () => void; onDelete: () => void; onQr: () => void }) =>"
if signature_anchor not in text:
    raise SystemExit('SiteCard signature anchor not found')
text = text.replace(signature_anchor, signature_replacement, 1)

buttons_grid_anchor = 'grid grid-cols-2 gap-2 sm:grid-cols-5'
if buttons_grid_anchor not in text:
    raise SystemExit('SiteCard buttons grid anchor not found')
text = text.replace(buttons_grid_anchor, 'grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6', 1)

preview_anchor = '<Button variant="outline" className={button3d} onClick={onPreview}><Eye className="ml-1 h-4 w-4" />معاينة</Button>{canEdit &&'
preview_replacement = '<Button variant="outline" className={button3d} onClick={onPreview}><Eye className="ml-1 h-4 w-4" />معاينة</Button>{canPrint && <Button variant="outline" className={button3d} onClick={onPrint}><Printer className="ml-1 h-4 w-4" />طباعة / PDF</Button>}{canEdit &&'
if preview_anchor not in text:
    raise SystemExit('SiteCard preview button anchor not found')
text = text.replace(preview_anchor, preview_replacement, 1)

path.write_text(text, encoding='utf-8')
print('Mosque print/PDF card and table controls applied successfully.')
