from pathlib import Path

api_path = Path('src/app/api/mosques.ts')
page_path = Path('src/app/pages/MosquesUnitPage.tsx')

api = api_path.read_text(encoding='utf-8')
page = page_path.read_text(encoding='utf-8')

# ---------------- API types ----------------
if 'quranTargetCount?: number | null;' not in api:
    anchor = '  capacity?: number | null;\n  latitude?: number | null;'
    if anchor not in api:
        raise SystemExit('MosqueSite capacity type anchor not found')
    api = api.replace(anchor, '  capacity?: number | null;\n  quranTargetCount?: number | null;\n  latitude?: number | null;', 1)

old = "    site: Pick<MosqueSite, 'id' | 'name' | 'siteType' | 'prayerRoomGender' | 'city' | 'district' | 'campusLocation'>;\n    latestInventory: MosqueQuranInventory | null;\n    systemStock: MosqueQuranStockCount;\n    withdrawnStock: MosqueQuranStockCount;"
new = "    site: Pick<MosqueSite, 'id' | 'name' | 'siteType' | 'prayerRoomGender' | 'city' | 'district' | 'campusLocation' | 'quranTargetCount'>;\n    latestInventory: MosqueQuranInventory | null;\n    systemStock: MosqueQuranStockCount;\n    withdrawnStock: MosqueQuranStockCount;\n    targetCount: number;\n    needCount: number;\n    coveragePercent: number | null;\n    needLevel: 'not_set' | 'complete' | 'low' | 'medium' | 'high';"
if 'coveragePercent: number | null;' not in api:
    if old not in api:
        raise SystemExit('Quran stock dashboard site type anchor not found')
    api = api.replace(old, new, 1)

# ---------------- Site form / payload ----------------
old = "  name: '', siteType: 'mosque', prayerRoomGender: '', city: 'الدمام', district: '', campusLocation: '', area: '', capacity: '', latitude: '', longitude: '',"
new = "  name: '', siteType: 'mosque', prayerRoomGender: '', city: 'الدمام', district: '', campusLocation: '', area: '', capacity: '', quranTargetCount: '', latitude: '', longitude: '',"
if 'quranTargetCount: \'\'' not in page:
    if old not in page:
        raise SystemExit('emptySite anchor not found')
    page = page.replace(old, new, 1)

old = "  area: site.area ?? null,\n  capacity: site.capacity ?? null,\n  latitude: site.latitude ?? null,"
new = "  area: site.area ?? null,\n  capacity: site.capacity ?? null,\n  quranTargetCount: site.quranTargetCount ?? null,\n  latitude: site.latitude ?? null,"
if 'quranTargetCount: site.quranTargetCount ?? null' not in page:
    if old not in page:
        raise SystemExit('mediaImportSitePayload anchor not found')
    page = page.replace(old, new, 1)

old = "      area: site.area ?? '', capacity: site.capacity ?? '', latitude: site.latitude ?? '', longitude: site.longitude ?? '', status: site.status,"
new = "      area: site.area ?? '', capacity: site.capacity ?? '', quranTargetCount: site.quranTargetCount ?? '', latitude: site.latitude ?? '', longitude: site.longitude ?? '', status: site.status,"
if "quranTargetCount: site.quranTargetCount ?? ''" not in page:
    if old not in page:
        raise SystemExit('openSiteDialog site form anchor not found')
    page = page.replace(old, new, 1)

old = "        capacity: siteForm.capacity === '' ? null : Number(siteForm.capacity),\n        latitude: siteForm.latitude === '' ? null : Number(siteForm.latitude),"
new = "        capacity: siteForm.capacity === '' ? null : Number(siteForm.capacity),\n        quranTargetCount: siteForm.quranTargetCount === '' ? null : Number(siteForm.quranTargetCount),\n        latitude: siteForm.latitude === '' ? null : Number(siteForm.latitude),"
if 'quranTargetCount: siteForm.quranTargetCount' not in page:
    if old not in page:
        raise SystemExit('saveSite capacity payload anchor not found')
    page = page.replace(old, new, 1)

old = '<CardContent className="grid grid-cols-1 gap-4 pt-5 md:grid-cols-3">\n                <Field label="المساحة م²"><Input className="h-11" type="number" min="0" step="any" inputMode="decimal" value={siteForm.area} onChange={(e) => setSiteForm({ ...siteForm, area: e.target.value })} /></Field>\n                <Field label="الطاقة الاستيعابية"><Input className="h-11" type="number" min="0" inputMode="numeric" value={siteForm.capacity} onChange={(e) => setSiteForm({ ...siteForm, capacity: e.target.value })} /></Field>\n                <Field label="رقم التواصل"><Input className="h-11" type="tel" inputMode="tel" value={siteForm.contactPhone} onChange={(e) => setSiteForm({ ...siteForm, contactPhone: e.target.value })} placeholder="05xxxxxxxx" /></Field>\n              </CardContent>'
new = '<CardContent className="grid grid-cols-1 gap-4 pt-5 md:grid-cols-2 xl:grid-cols-4">\n                <Field label="المساحة م²"><Input className="h-11" type="number" min="0" step="any" inputMode="decimal" value={siteForm.area} onChange={(e) => setSiteForm({ ...siteForm, area: e.target.value })} /></Field>\n                <Field label="الطاقة الاستيعابية"><Input className="h-11" type="number" min="0" inputMode="numeric" value={siteForm.capacity} onChange={(e) => setSiteForm({ ...siteForm, capacity: e.target.value })} /></Field>\n                <Field label="العدد المستهدف للمصاحف"><Input className="h-11" type="number" min="0" step="1" inputMode="numeric" value={siteForm.quranTargetCount} onChange={(e) => setSiteForm({ ...siteForm, quranTargetCount: e.target.value })} placeholder="مثال: 100" /><p className="mt-1 text-[11px] leading-5 text-muted-foreground">العدد المناسب توفره في الموقع؛ يحسب النظام الاحتياج تلقائيًا من الرصيد الحالي.</p></Field>\n                <Field label="رقم التواصل"><Input className="h-11" type="tel" inputMode="tel" value={siteForm.contactPhone} onChange={(e) => setSiteForm({ ...siteForm, contactPhone: e.target.value })} placeholder="05xxxxxxxx" /></Field>\n              </CardContent>'
if 'label="العدد المستهدف للمصاحف"' not in page:
    if old not in page:
        raise SystemExit('site capacity card anchor not found')
    page = page.replace(old, new, 1)

# ---------------- Automatic need filter ----------------
old = "      const matchesNeed = !quranNeedOnly || Number(item.latest?.neededCount || 0) > 0;\n      return matchesSearch && matchesNeed;\n    });\n  }, [quranInventoryItems, quranSearch, quranNeedOnly]);"
new = "      const calculatedNeed = quranStockDashboard?.sites.find((row) => row.site.id === item.site.id)?.needCount || 0;\n      const matchesNeed = !quranNeedOnly || calculatedNeed > 0;\n      return matchesSearch && matchesNeed;\n    });\n  }, [quranInventoryItems, quranStockDashboard, quranSearch, quranNeedOnly]);"
if 'const calculatedNeed = quranStockDashboard?.sites.find' not in page:
    if old not in page:
        raise SystemExit('Quran need filter anchor not found')
    page = page.replace(old, new, 1)

# ---------------- Quran print/report calculations ----------------
old = "      const damaged = Number(stockRow?.withdrawnStock?.totalCount ?? 0);\n      const needed = Number(latest?.neededCount ?? 0);\n      const lastCountAt = latest?.countedAt ? new Date(latest.countedAt).getTime() : 0;\n      return { item, site, latest, large, medium, small, total, damaged, needed, lastCountAt };"
new = "      const damaged = Number(stockRow?.withdrawnStock?.totalCount ?? 0);\n      const target = Number(stockRow?.targetCount ?? site.quranTargetCount ?? 0);\n      const needed = Number(stockRow?.needCount ?? 0);\n      const coverage = stockRow?.coveragePercent ?? (target > 0 ? Math.min(100, Math.round((total / target) * 100)) : null);\n      const lastCountAt = latest?.countedAt ? new Date(latest.countedAt).getTime() : 0;\n      return { item, site, latest, large, medium, small, total, damaged, target, needed, coverage, lastCountAt };"
if 'const target = Number(stockRow?.targetCount' not in page:
    if old not in page:
        raise SystemExit('quranPrintRows need anchor not found')
    page = page.replace(old, new, 1)

old = '<td class="damaged">${row.damaged}</td><td class="needed">${row.needed}</td><td>${row.latest ? esc(new Date(row.latest.countedAt).toLocaleDateString(\'ar-SA-u-ca-gregory\')) : \'لم يجرد\'}</td>'
new = '<td class="damaged">${row.damaged}</td><td>${row.target || \'-\'}</td><td>${row.coverage == null ? \'-\' : `${row.coverage}%`}</td><td class="needed">${row.needed}</td><td>${row.latest ? esc(new Date(row.latest.countedAt).toLocaleDateString(\'ar-SA-u-ca-gregory\')) : \'لم يجرد\'}</td>'
if '<td>${row.target || \'-\'}</td>' not in page:
    if old not in page:
        raise SystemExit('Quran printable row anchor not found')
    page = page.replace(old, new, 1)

old = '<th>الإجمالي</th><th>المسحوبة</th><th>الاحتياج</th><th>آخر جرد</th>'
new = '<th>الإجمالي</th><th>المسحوبة</th><th>المستهدف</th><th>التغطية</th><th>الاحتياج</th><th>آخر جرد</th>'
if '<th>المستهدف</th><th>التغطية</th>' not in page:
    if old not in page:
        raise SystemExit('Quran printable header anchor not found')
    page = page.replace(old, new, 1)

# ---------------- Site card print uses automatic need ----------------
old = "      const quranInventory = quranLatestBySite[site.id] as MosqueQuranInventory | null | undefined;\n      const quranWithdrawn = quranStockDashboard?.sites.find((row) => row.site.id === site.id)?.withdrawnStock?.totalCount || 0;"
new = "      const quranInventory = quranLatestBySite[site.id] as MosqueQuranInventory | null | undefined;\n      const quranStockRow = quranStockDashboard?.sites.find((row) => row.site.id === site.id);\n      const quranWithdrawn = quranStockRow?.withdrawnStock?.totalCount || 0;"
if 'const quranStockRow = quranStockDashboard?.sites.find' not in page:
    if old not in page:
        raise SystemExit('site card Quran stock anchor not found')
    page = page.replace(old, new, 1)

old = "        ['المصاحف المسحوبة', quranWithdrawn.toLocaleString('ar-SA')],\n        ['الاحتياج الحالي', quranInventory?.neededCount?.toLocaleString('ar-SA') || '-'],"
new = "        ['المصاحف المسحوبة', quranWithdrawn.toLocaleString('ar-SA')],\n        ['العدد المستهدف للمصاحف', quranStockRow?.targetCount ? quranStockRow.targetCount.toLocaleString('ar-SA') : '-'],\n        ['نسبة التغطية', quranStockRow?.coveragePercent != null ? `${quranStockRow.coveragePercent}%` : '-'],\n        ['الاحتياج الحالي', (quranStockRow?.needCount || 0).toLocaleString('ar-SA')],"
if "['العدد المستهدف للمصاحف'" not in page:
    if old not in page:
        raise SystemExit('site card need info anchor not found')
    page = page.replace(old, new, 1)

# ---------------- Quran dashboard UI ----------------
old = '<ReportMetric label="الاحتياج الحالي" value={quranSummary.needed} />'
new = '<ReportMetric label="الاحتياج الحالي" value={quranStockDashboard?.summary.siteNeedTotal ?? 0} />'
if old in page:
    page = page.replace(old, new, 1)

old = '<table className="w-full min-w-[980px] text-sm">\n                  <thead className="bg-sky-50 text-slate-700"><tr><th className="p-3 text-right">المسجد / المصلى</th><th className="p-3 text-center">كبيرة</th><th className="p-3 text-center">متوسطة</th><th className="p-3 text-center">صغيرة</th><th className="p-3 text-center">الإجمالي</th><th className="p-3 text-center">المسحوبة</th><th className="p-3 text-center">الاحتياج</th><th className="p-3 text-center">آخر جرد</th><th className="p-3 text-center">الإجراءات</th></tr></thead>'
new = '<table className="w-full min-w-[1220px] text-sm">\n                  <thead className="bg-sky-50 text-slate-700"><tr><th className="p-3 text-right">المسجد / المصلى</th><th className="p-3 text-center">كبيرة</th><th className="p-3 text-center">متوسطة</th><th className="p-3 text-center">صغيرة</th><th className="p-3 text-center">الإجمالي</th><th className="p-3 text-center">المسحوبة</th><th className="p-3 text-center">المستهدف</th><th className="p-3 text-center">التغطية</th><th className="p-3 text-center">الاحتياج</th><th className="p-3 text-center">آخر جرد</th><th className="p-3 text-center">الإجراءات</th></tr></thead>'
if 'min-w-[1220px]' not in page:
    if old not in page:
        raise SystemExit('Quran dashboard table header anchor not found')
    page = page.replace(old, new, 1)

old = '<td className="p-3 text-center font-bold text-red-600">{withdrawnStock?.totalCount ?? 0}</td><td className="p-3 text-center font-bold text-amber-700">{latest?.neededCount ?? 0}</td><td className="p-3 text-center text-xs">'
new = '<td className="p-3 text-center font-bold text-red-600">{withdrawnStock?.totalCount ?? 0}</td><td className="p-3 text-center font-black text-slate-800">{stockRow?.targetCount ? stockRow.targetCount : <Badge variant="outline" className="border-slate-200 bg-slate-50 text-slate-500">غير محدد</Badge>}</td><td className="p-3 text-center">{stockRow?.coveragePercent != null ? <Badge variant="outline" className={stockRow.needLevel === \'complete\' ? \'border-emerald-300 bg-emerald-50 text-emerald-700\' : stockRow.needLevel === \'low\' ? \'border-amber-300 bg-amber-50 text-amber-800\' : stockRow.needLevel === \'medium\' ? \'border-orange-300 bg-orange-50 text-orange-800\' : \'border-red-300 bg-red-50 text-red-700\'}>{stockRow.coveragePercent}%</Badge> : \'-\'}</td><td className={`p-3 text-center font-black ${Number(stockRow?.needCount || 0) > 0 ? \'text-amber-700\' : \'text-emerald-700\'}`}>{stockRow?.needCount ?? 0}</td><td className="p-3 text-center text-xs">'
if 'stockRow?.coveragePercent != null ? <Badge' not in page:
    if old not in page:
        raise SystemExit('Quran dashboard need cell anchor not found')
    page = page.replace(old, new, 1)

old = "{role === 'head' && quranOpeningBaselineStatus && !quranOpeningBaselineStatus.closed && <Button size=\"sm\""
new = "{canEdit && ['head', 'supervisor'].includes(role) && <Button size=\"sm\" variant=\"outline\" className={`${button3d} border-sky-200 bg-sky-50 text-sky-800 hover:bg-sky-100`} onClick={() => openSiteDialog(site)}><Pencil className=\"ml-1 h-3.5 w-3.5\" />ضبط المستهدف</Button>}{role === 'head' && quranOpeningBaselineStatus && !quranOpeningBaselineStatus.closed && <Button size=\"sm\""
if '>ضبط المستهدف</Button>' not in page:
    if old not in page:
        raise SystemExit('Quran row actions anchor not found')
    page = page.replace(old, new, 1)

# ---------------- Excel export: replace legacy manual need with automatic values ----------------
old = "المسحوبة: quranStockDashboard?.sites.find((row) => row.site.id === item.site.id)?.withdrawnStock?.totalCount || 0, الاحتياج: item.latest?.neededCount || 0, 'آخر جرد'"
new = "المسحوبة: quranStockDashboard?.sites.find((row) => row.site.id === item.site.id)?.withdrawnStock?.totalCount || 0, المستهدف: quranStockDashboard?.sites.find((row) => row.site.id === item.site.id)?.targetCount || 0, التغطية: quranStockDashboard?.sites.find((row) => row.site.id === item.site.id)?.coveragePercent != null ? `${quranStockDashboard?.sites.find((row) => row.site.id === item.site.id)?.coveragePercent}%` : '-', الاحتياج: quranStockDashboard?.sites.find((row) => row.site.id === item.site.id)?.needCount || 0, 'آخر جرد'"
if 'المستهدف: quranStockDashboard?.sites.find' not in page:
    if old not in page:
        raise SystemExit('Excel Quran need anchor not found')
    page = page.replace(old, new, 1)

api_path.write_text(api, encoding='utf-8')
page_path.write_text(page, encoding='utf-8')
print('Quran target capacity frontend patch applied')
