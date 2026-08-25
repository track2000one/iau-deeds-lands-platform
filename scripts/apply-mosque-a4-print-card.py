from pathlib import Path

path = Path('src/app/pages/MosquesUnitPage.tsx')
text = path.read_text(encoding='utf-8')

state_anchor = "  const [previewSite, setPreviewSite] = useState<MosqueSite | null>(null);\n  const [qrSite, setQrSite] = useState<MosqueSite | null>(null);"
state_replacement = "  const [previewSite, setPreviewSite] = useState<MosqueSite | null>(null);\n  const [printingSiteCard, setPrintingSiteCard] = useState(false);\n  const [qrSite, setQrSite] = useState<MosqueSite | null>(null);"
if state_anchor not in text:
    raise SystemExit('state anchor not found')
text = text.replace(state_anchor, state_replacement, 1)

public_anchor = "  const publicUrlForSite = (site: MosqueSite) => `${window.location.origin}${window.location.pathname}#/mosques/public?site=${encodeURIComponent(site.publicToken)}`;\n"
print_handler = r'''  const publicUrlForSite = (site: MosqueSite) => `${window.location.origin}${window.location.pathname}#/mosques/public?site=${encodeURIComponent(site.publicToken)}`;

  const printSiteCard = async (site: MosqueSite) => {
    if (printingSiteCard) return;
    const printWindow = window.open('', '_blank', 'width=1050,height=900');
    if (!printWindow) {
      toast.error('تعذر فتح نافذة الطباعة. اسمح بالنوافذ المنبثقة للمنصة ثم أعد المحاولة.');
      return;
    }

    const escapeHtml = (value: unknown) => String(value ?? '').replace(/[&<>"']/g, (char) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;',
    }[char] || char));
    const display = (value: unknown) => value === null || value === undefined || value === '' ? '-' : escapeHtml(value);
    const objectUrls: string[] = [];
    let cleanupTimer: number | undefined;
    const cleanup = () => {
      objectUrls.forEach((url) => URL.revokeObjectURL(url));
      objectUrls.splice(0, objectUrls.length);
      if (cleanupTimer) window.clearTimeout(cleanupTimer);
    };

    setPrintingSiteCard(true);
    try {
      printWindow.document.open();
      printWindow.document.write('<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><title>جاري تجهيز بطاقة الطباعة</title></head><body style="font-family:Tahoma,Arial,sans-serif;direction:rtl;padding:40px;text-align:center"><h2>جاري تجهيز بطاقة المسجد / المصلى للطباعة...</h2><p>يتم الآن تحميل الصور المرفقة بأمان.</p></body></html>');
      printWindow.document.close();

      const media = normalizeSiteMedia(site.images);
      const photosToPrint = media.photos.slice(0, 6);
      const preparedPhotos = await Promise.all(photosToPrint.map(async (item) => {
        let src = drivePreviewUrl(item.url);
        if (item.fileId) {
          try {
            const blob = await mosqueApi.mediaBlob(item.fileId);
            src = URL.createObjectURL(blob);
            objectUrls.push(src);
          } catch {
            // Keep Google Drive thumbnail as a fallback for legacy/temporarily unavailable media.
          }
        }
        return { ...item, src };
      }));

      const location = [site.campusLocation, site.city, site.district].filter(Boolean).join(' — ') || '-';
      const buildingCode = String(site.campusLocation || '').match(/\b(?:M|A|H)\d+\b/i)?.[0]?.toUpperCase() || '-';
      const coordinates = site.latitude != null && site.longitude != null ? `${site.latitude}, ${site.longitude}` : '-';
      const infoItems = [
        ['الاسم', site.name],
        ['النوع', siteTypeLabels[site.siteType] || site.siteType],
        ['رقم المبنى', buildingCode],
        ['الحالة', siteStatusLabels[site.status] || site.status],
        ['الموقع داخل الجامعة', location],
        ['المساحة', site.area ? `${site.area.toLocaleString('ar-SA')} م²` : '-'],
        ['الطاقة الاستيعابية', site.capacity ? site.capacity.toLocaleString('ar-SA') : '-'],
        ['الإمام', site.imamName || '-'],
        ['المؤذن', site.muezzinName || '-'],
        ['الخطيب', site.khateebName || '-'],
        ['رقم التواصل', site.contactPhone || '-'],
        ['الإحداثيات', coordinates],
      ];
      const infoHtml = infoItems.map(([label, value], index) => `
        <div class="info-item ${index === 4 ? 'wide' : ''}">
          <div class="info-label">${escapeHtml(label)}</div>
          <div class="info-value">${display(value)}</div>
        </div>`).join('');

      const photosHtml = preparedPhotos.length ? preparedPhotos.map((item, index) => `
        <figure class="photo-card">
          <img src="${escapeHtml(item.src)}" alt="${escapeHtml(item.fileName || `صورة ${index + 1}`)}" />
          <figcaption>
            <span>${escapeHtml(item.fileName || `صورة ${index + 1}`)}</span>
            <b>${item.category === 'site_image' ? 'صورة الموقع' : 'صورة المسجد / المصلى'}</b>
          </figcaption>
        </figure>`).join('') : '<div class="empty-photos">لا توجد صور مرفقة في سجل الموقع.</div>';
      const extraPhotos = media.photos.length > preparedPhotos.length
        ? `<div class="extra-note">تم إظهار أول ${preparedPhotos.length} صور للمحافظة على تنسيق صفحة A4، ويوجد ${media.photos.length - preparedPhotos.length} صور إضافية في سجل المنصة.</div>`
        : '';

      const html = `<!doctype html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>بطاقة ${escapeHtml(site.name)}</title>
  <style>
    @page { size: A4 portrait; margin: 10mm; }
    * { box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    html, body { margin: 0; padding: 0; background: #fff; color: #172033; font-family: Tahoma, Arial, sans-serif; direction: rtl; }
    body { width: 100%; }
    .sheet { width: 100%; min-height: 277mm; border: 1px solid #d9e3ee; border-radius: 5mm; overflow: hidden; background: #fff; }
    .header { padding: 7mm 8mm 5mm; border-bottom: 1px solid #dbe7f1; background: linear-gradient(90deg,#f0f9ff,#ffffff,#ecfdf5); }
    .header-kicker { font-size: 10px; color: #527089; margin-bottom: 2mm; }
    .header-row { display: flex; align-items: center; justify-content: space-between; gap: 6mm; }
    .title { margin: 0; font-size: 23px; font-weight: 900; color: #102a43; }
    .subtitle { margin: 2mm 0 0; font-size: 11px; color: #66788a; }
    .status { flex: 0 0 auto; border: 1px solid #86efac; color: #047857; background: #ecfdf5; border-radius: 999px; padding: 2mm 4mm; font-size: 10px; font-weight: 700; }
    .section { margin: 5mm 7mm 0; border: 1px solid #d8e3ed; border-radius: 4mm; overflow: hidden; break-inside: avoid; }
    .section-title { padding: 3mm 4mm; font-size: 12px; font-weight: 900; color: #1f3a53; background: #f8fbfd; border-bottom: 1px solid #e2eaf1; }
    .info-grid { display: grid; grid-template-columns: repeat(2,minmax(0,1fr)); }
    .info-item { min-height: 17mm; padding: 3mm 4mm; border-bottom: 1px solid #edf2f6; }
    .info-item:nth-child(odd) { border-left: 1px solid #edf2f6; }
    .info-item.wide { grid-column: 1 / -1; border-left: 0; }
    .info-label { margin-bottom: 1mm; font-size: 9px; color: #74879a; }
    .info-value { font-size: 11px; line-height: 1.65; font-weight: 700; color: #172b3a; word-break: break-word; }
    .notes { padding: 4mm; font-size: 10px; line-height: 1.8; color: #334e68; white-space: pre-wrap; min-height: 12mm; }
    .photos-head { display: flex; justify-content: space-between; align-items: center; gap: 4mm; padding: 3mm 4mm; border-bottom: 1px solid #e2eaf1; background: #f8fbfd; }
    .photos-head strong { font-size: 12px; color: #1f3a53; }
    .photos-count { font-size: 9px; color: #526d82; border: 1px solid #cedbe5; border-radius: 999px; padding: 1.2mm 3mm; background: #fff; }
    .photo-grid { display: grid; grid-template-columns: repeat(3,minmax(0,1fr)); gap: 3mm; padding: 4mm; }
    .photo-card { margin: 0; overflow: hidden; border: 1px solid #dbe5ed; border-radius: 3mm; background: #fff; break-inside: avoid; }
    .photo-card img { display: block; width: 100%; height: 37mm; object-fit: cover; background: #f1f5f9; }
    .photo-card figcaption { display: flex; align-items: center; justify-content: space-between; gap: 2mm; padding: 2mm 2.5mm; font-size: 8px; color: #43586a; }
    .photo-card figcaption span { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 65%; }
    .photo-card figcaption b { font-size: 7px; color: #0f6f99; font-weight: 700; white-space: nowrap; }
    .empty-photos { grid-column: 1 / -1; padding: 12mm; text-align: center; color: #7b8c9a; font-size: 10px; }
    .extra-note { margin: 0 4mm 4mm; border: 1px dashed #cbd9e5; border-radius: 3mm; padding: 2.5mm 3mm; font-size: 8px; color: #61788b; background: #fafcfe; }
    .footer { margin: 5mm 7mm 6mm; padding-top: 3mm; border-top: 1px solid #e2e8f0; display: flex; justify-content: space-between; gap: 5mm; font-size: 8px; color: #728497; }
    @media print { .sheet { border-color: #cad8e3; } }
  </style>
</head>
<body>
  <main class="sheet">
    <header class="header">
      <div class="header-kicker">جامعة الإمام عبدالرحمن بن فيصل — وحدة العناية بالمساجد والمصليات الجامعية</div>
      <div class="header-row">
        <div>
          <h1 class="title">بطاقة تعريف المسجد / المصلى</h1>
          <p class="subtitle">${escapeHtml(site.name)} — بطاقة A4 مستخرجة من منصة إدارة الأملاك والأراضي</p>
        </div>
        <span class="status">${escapeHtml(siteStatusLabels[site.status] || site.status)}</span>
      </div>
    </header>

    <section class="section">
      <div class="section-title">البيانات الأساسية</div>
      <div class="info-grid">${infoHtml}</div>
    </section>

    ${site.notes ? `<section class="section"><div class="section-title">الملاحظات</div><div class="notes">${escapeHtml(site.notes)}</div></section>` : ''}

    <section class="section">
      <div class="photos-head"><strong>الصور المرفقة</strong><span class="photos-count">${media.photos.length} صورة</span></div>
      <div class="photo-grid">${photosHtml}</div>
      ${extraPhotos}
    </section>

    <footer class="footer"><span>منصة إدارة الأملاك والأراضي — IAU Deeds</span><span>وحدة العناية بالمساجد والمصليات الجامعية</span></footer>
  </main>
</body>
</html>`;

      printWindow.document.open();
      printWindow.document.write(html);
      printWindow.document.close();

      await new Promise<void>((resolve) => {
        const finish = () => resolve();
        const images = Array.from(printWindow.document.images);
        if (!images.length || images.every((image) => image.complete)) return finish();
        let remaining = images.filter((image) => !image.complete).length;
        const settled = () => {
          remaining -= 1;
          if (remaining <= 0) finish();
        };
        images.filter((image) => !image.complete).forEach((image) => {
          image.addEventListener('load', settled, { once: true });
          image.addEventListener('error', settled, { once: true });
        });
        window.setTimeout(finish, 3500);
      });

      printWindow.onafterprint = () => {
        cleanup();
        printWindow.close();
      };
      cleanupTimer = window.setTimeout(cleanup, 120000);
      printWindow.focus();
      printWindow.print();
    } catch (error) {
      cleanup();
      printWindow.close();
      toast.error(error instanceof Error ? error.message : 'تعذر تجهيز بطاقة الطباعة');
    } finally {
      setPrintingSiteCard(false);
    }
  };
'''
if public_anchor not in text:
    raise SystemExit('public URL anchor not found')
text = text.replace(public_anchor, print_handler, 1)

preview_anchor = '''            {previewSite.latitude != null && previewSite.longitude != null && <div className="flex justify-end"><Button variant="outline" className={button3d} onClick={() => window.open(`https://www.google.com/maps?q=${previewSite.latitude},${previewSite.longitude}`, '_blank')}><MapPin className="ml-2 h-4 w-4" />فتح الموقع على الخريطة</Button></div>}'''
preview_replacement = '''            {(canPrint || (previewSite.latitude != null && previewSite.longitude != null)) && <div className="flex flex-wrap justify-end gap-2">
              {canPrint && <Button variant="outline" className={button3d} onClick={() => void printSiteCard(previewSite)} disabled={printingSiteCard}>{printingSiteCard ? <RefreshCw className="ml-2 h-4 w-4 animate-spin" /> : <Printer className="ml-2 h-4 w-4" />}{printingSiteCard ? 'جاري تجهيز الطباعة...' : 'طباعة بطاقة A4'}</Button>}
              {previewSite.latitude != null && previewSite.longitude != null && <Button variant="outline" className={button3d} onClick={() => window.open(`https://www.google.com/maps?q=${previewSite.latitude},${previewSite.longitude}`, '_blank')}><MapPin className="ml-2 h-4 w-4" />فتح الموقع على الخريطة</Button>}
            </div>}'''
if preview_anchor not in text:
    raise SystemExit('preview action anchor not found')
text = text.replace(preview_anchor, preview_replacement, 1)

path.write_text(text, encoding='utf-8')
print('Mosque A4 print card patch applied successfully.')
