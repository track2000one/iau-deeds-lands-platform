from pathlib import Path


def replace_once(text: str, old: str, new: str, label: str) -> str:
    count = text.count(old)
    if count != 1:
        raise SystemExit(f'{label}: expected 1 match, found {count}')
    return text.replace(old, new, 1)

# -----------------------------------------------------------------------------
# API client types + methods
# -----------------------------------------------------------------------------
api_path = Path('src/app/api/mosques.ts')
api = api_path.read_text(encoding='utf-8')

if 'export type MosqueQuranInventory =' not in api:
    anchor = '''export type MosquePersonnel = {
  id: string;
  siteId: string;
  userId?: string | null;
  name: string;
  role: string;
  mobile?: string | null;
  email?: string | null;
  active: boolean;
  site?: { name: string };
};
'''
    types = anchor + r'''

export type MosqueQuranInventory = {
  id: string;
  siteId: string;
  largeCount: number;
  mediumCount: number;
  smallCount: number;
  damagedCount: number;
  neededCount: number;
  totalCount: number;
  countedAt: string;
  countedBy?: string | null;
  countedByName?: string | null;
  notes?: string | null;
  createdAt: string;
  site?: { id: string; name: string };
};

export type MosqueQuranInventoryOverviewItem = {
  site: Pick<MosqueSite, 'id' | 'name' | 'siteType' | 'prayerRoomGender' | 'city' | 'district' | 'campusLocation' | 'status'>;
  latest: MosqueQuranInventory | null;
};

export type MosqueQuranInventorySummary = {
  sites: number;
  countedSites: number;
  total: number;
  large: number;
  medium: number;
  small: number;
  damaged: number;
  needed: number;
};

export type MosqueQuranInventoryResponse = {
  items: MosqueQuranInventoryOverviewItem[];
  summary: MosqueQuranInventorySummary;
};
'''
    api = replace_once(api, anchor, types, 'Quran API types')

if 'quranInventory:' not in api:
    anchor = '''  personnel: () => apiJson<MosquePersonnel[]>('/api/mosques/personnel'),
'''
    methods = r'''  quranInventory: () => apiJson<MosqueQuranInventoryResponse>('/api/mosques/quran-inventory'),
  quranInventoryHistory: (siteId: string) => apiJson<MosqueQuranInventory[]>(`/api/mosques/quran-inventory/${siteId}/history`),
  createQuranInventory: (input: Record<string, unknown>) => apiJson<MosqueQuranInventory>('/api/mosques/quran-inventory', { method: 'POST', body: JSON.stringify(input) }),

'''
    api = replace_once(api, anchor, methods + anchor, 'Quran API methods')

api_path.write_text(api, encoding='utf-8')

# -----------------------------------------------------------------------------
# Main page
# -----------------------------------------------------------------------------
page_path = Path('src/app/pages/MosquesUnitPage.tsx')
text = page_path.read_text(encoding='utf-8')

if 'BookOpen,' not in text:
    text = replace_once(text, '  Bell,\n', '  Bell,\n  BookOpen,\n', 'BookOpen icon import')

if 'type MosqueQuranInventory,' not in text:
    text = replace_once(
        text,
        '  type MosquePersonnel,\n',
        '  type MosquePersonnel,\n  type MosqueQuranInventory,\n  type MosqueQuranInventoryOverviewItem,\n  type MosqueQuranInventorySummary,\n',
        'Quran type imports',
    )

if 'const emptyQuranInventoryForm' not in text:
    anchor = "const emptyLeave = { siteId: '', requestType: 'leave', startDate: '', endDate: '', reason: '', replacementName: '', notes: '' };\n"
    addition = anchor + r'''
const emptyQuranInventoryForm = () => ({
  siteId: '',
  largeCount: '0',
  mediumCount: '0',
  smallCount: '0',
  damagedCount: '0',
  neededCount: '0',
  countedAt: new Date().toISOString().slice(0, 10),
  notes: '',
});
const emptyQuranSummary: MosqueQuranInventorySummary = { sites: 0, countedSites: 0, total: 0, large: 0, medium: 0, small: 0, damaged: 0, needed: 0 };
'''
    text = replace_once(text, anchor, addition, 'Quran empty form')

if 'const [quranInventoryItems' not in text:
    anchor = "  const [personnel, setPersonnel] = useState<MosquePersonnel[]>([]);\n"
    addition = anchor + r'''  const [quranInventoryItems, setQuranInventoryItems] = useState<MosqueQuranInventoryOverviewItem[]>([]);
  const [quranSummary, setQuranSummary] = useState<MosqueQuranInventorySummary>(emptyQuranSummary);
  const [quranSearch, setQuranSearch] = useState('');
  const [quranNeedOnly, setQuranNeedOnly] = useState(false);
  const [quranDialog, setQuranDialog] = useState(false);
  const [quranForm, setQuranForm] = useState<any>(emptyQuranInventoryForm());
  const [quranInventorySite, setQuranInventorySite] = useState<MosqueSite | null>(null);
  const [quranHistorySite, setQuranHistorySite] = useState<MosqueSite | null>(null);
  const [quranHistoryRows, setQuranHistoryRows] = useState<MosqueQuranInventory[]>([]);
  const [quranHistoryLoading, setQuranHistoryLoading] = useState(false);
'''
    text = replace_once(text, anchor, addition, 'Quran states')

if 'const quranData = await mosqueApi.quranInventory()' not in text:
    anchor = '''      setDashboard(dash);
      setSites(siteRows);
      setNotifications(noticeRows);

'''
    addition = '''      setDashboard(dash);
      setSites(siteRows);
      setNotifications(noticeRows);

      if (['head', 'supervisor', 'personnel'].includes(me.role)) {
        try {
          const quranData = await mosqueApi.quranInventory();
          setQuranInventoryItems(quranData.items || []);
          setQuranSummary(quranData.summary || emptyQuranSummary);
        } catch {
          setQuranInventoryItems([]);
          setQuranSummary(emptyQuranSummary);
        }
      } else {
        setQuranInventoryItems([]);
        setQuranSummary(emptyQuranSummary);
      }

'''
    text = replace_once(text, anchor, addition, 'load Quran inventory')

if 'const quranLatestBySite' not in text:
    anchor = '''  const resetSiteFilters = () => {
    setSearch('');
    setSiteFilterCity('');
    setSiteFilterType('all');
    setSiteFilterStatus('all');
    setSiteSortBy('name');
    setSiteSortDirection('asc');
  };

'''
    quran_helpers = r'''  const quranLatestBySite = useMemo(() => Object.fromEntries(quranInventoryItems.map((item) => [item.site.id, item.latest])), [quranInventoryItems]);
  const filteredQuranInventoryItems = useMemo(() => {
    const q = quranSearch.trim().toLowerCase();
    return quranInventoryItems.filter((item) => {
      const matchesSearch = !q || [item.site.name, item.site.city, item.site.district, item.site.campusLocation]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(q));
      const matchesNeed = !quranNeedOnly || Number(item.latest?.neededCount || 0) > 0;
      return matchesSearch && matchesNeed;
    });
  }, [quranInventoryItems, quranSearch, quranNeedOnly]);

  const openQuranInventoryDialog = (site: MosqueSite) => {
    const latest = quranLatestBySite[site.id] as MosqueQuranInventory | null | undefined;
    setQuranInventorySite(site);
    setQuranForm({
      siteId: site.id,
      largeCount: String(latest?.largeCount ?? 0),
      mediumCount: String(latest?.mediumCount ?? 0),
      smallCount: String(latest?.smallCount ?? 0),
      damagedCount: String(latest?.damagedCount ?? 0),
      neededCount: String(latest?.neededCount ?? 0),
      countedAt: new Date().toISOString().slice(0, 10),
      notes: latest?.notes || '',
    });
    setQuranDialog(true);
  };

  const saveQuranInventory = async () => {
    if (!quranInventorySite) return;
    const values = ['largeCount', 'mediumCount', 'smallCount', 'damagedCount', 'neededCount'] as const;
    const parsed = Object.fromEntries(values.map((key) => [key, Number(quranForm[key] || 0)])) as Record<typeof values[number], number>;
    if (values.some((key) => !Number.isInteger(parsed[key]) || parsed[key] < 0)) return toast.error('أعداد المصاحف يجب أن تكون أرقامًا صحيحة غير سالبة');
    const total = parsed.largeCount + parsed.mediumCount + parsed.smallCount;
    if (parsed.damagedCount > total) return toast.error('عدد المصاحف التالفة لا يمكن أن يتجاوز إجمالي المصاحف');
    setSaving(true);
    try {
      await mosqueApi.createQuranInventory({
        siteId: quranInventorySite.id,
        ...parsed,
        countedAt: quranForm.countedAt || new Date().toISOString(),
        notes: quranForm.notes || null,
      });
      toast.success('تم حفظ جرد المصاحف وإضافته إلى السجل التاريخي');
      setQuranDialog(false);
      setQuranInventorySite(null);
      await loadAll();
    } catch (error) { toast.error(error instanceof Error ? error.message : 'تعذر حفظ جرد المصاحف'); } finally { setSaving(false); }
  };

  const openQuranHistory = async (site: MosqueSite) => {
    setQuranHistorySite(site);
    setQuranHistoryRows([]);
    setQuranHistoryLoading(true);
    try { setQuranHistoryRows(await mosqueApi.quranInventoryHistory(site.id)); }
    catch (error) { toast.error(error instanceof Error ? error.message : 'تعذر تحميل سجل الجرد'); }
    finally { setQuranHistoryLoading(false); }
  };

  const printQuranInventory = () => {
    if (!filteredQuranInventoryItems.length) return toast.info('لا توجد بيانات مصاحف للطباعة');
    const printWindow = window.open('', '_blank', 'width=1300,height=900');
    if (!printWindow) return toast.error('تعذر فتح نافذة الطباعة. اسمح بالنوافذ المنبثقة ثم أعد المحاولة.');
    const esc = (value: unknown) => String(value ?? '').replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[char] || char));
    const rows = filteredQuranInventoryItems.map((item, index) => {
      const latest = item.latest;
      return `<tr><td>${index + 1}</td><td class="name">${esc(item.site.name)}</td><td>${esc(siteTypeDisplayLabel(item.site as MosqueSite))}</td><td>${latest?.largeCount ?? 0}</td><td>${latest?.mediumCount ?? 0}</td><td>${latest?.smallCount ?? 0}</td><td class="total">${latest?.totalCount ?? 0}</td><td>${latest?.damagedCount ?? 0}</td><td>${latest?.neededCount ?? 0}</td><td>${latest ? esc(new Date(latest.countedAt).toLocaleDateString('ar-SA-u-ca-gregory')) : 'لم يجرد'}</td></tr>`;
    }).join('');
    const html = `<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><title>حصر المصاحف</title><style>@page{size:A4 landscape;margin:5mm}*{box-sizing:border-box;-webkit-print-color-adjust:exact;print-color-adjust:exact}body{font-family:Tahoma,Arial,sans-serif;margin:0;color:#172033;font-size:9px}h1{font-size:18px;margin:0 0 4px}.meta{color:#64748b;margin-bottom:10px}.metrics{display:grid;grid-template-columns:repeat(6,1fr);gap:5px;margin:8px 0}.metric{border:1px solid #cbd5e1;border-radius:7px;padding:6px;background:#f8fafc}.metric b{display:block;font-size:14px;margin-top:2px}table{width:100%;border-collapse:collapse;table-layout:fixed}th,td{border:1px solid #cbd5e1;padding:4px;text-align:center;vertical-align:middle}th{background:#e0f2fe;font-weight:900}.name{text-align:right;font-weight:800}.total{font-weight:900;background:#ecfdf5}.footer{margin-top:8px;color:#64748b;font-size:8px}@media print{button{display:none}}</style></head><body><h1>حصر المصاحف في المساجد والمصليات الجامعية</h1><div class="meta">تاريخ الاستخراج: ${esc(new Date().toLocaleString('ar-SA-u-ca-gregory'))} — عدد المواقع: ${filteredQuranInventoryItems.length}</div><div class="metrics"><div class="metric">الإجمالي<b>${quranSummary.total}</b></div><div class="metric">الكبيرة<b>${quranSummary.large}</b></div><div class="metric">المتوسطة<b>${quranSummary.medium}</b></div><div class="metric">الصغيرة<b>${quranSummary.small}</b></div><div class="metric">التالفة<b>${quranSummary.damaged}</b></div><div class="metric">الاحتياج<b>${quranSummary.needed}</b></div></div><table><thead><tr><th>م</th><th>المسجد / المصلى</th><th>النوع</th><th>كبيرة</th><th>متوسطة</th><th>صغيرة</th><th>الإجمالي</th><th>تالفة</th><th>الاحتياج</th><th>آخر جرد</th></tr></thead><tbody>${rows}</tbody></table><div class="footer">منصة إدارة الأملاك والأراضي — وحدة العناية بالمساجد والمصليات الجامعية. المصاحف التالفة محسوبة ضمن إجمالي الأحجام وليست مضافة عليه.</div></body></html>`;
    printWindow.document.open(); printWindow.document.write(html); printWindow.document.close(); printWindow.focus(); window.setTimeout(() => printWindow.print(), 250);
  };

'''
    text = replace_once(text, anchor, anchor + quran_helpers, 'Quran UI helpers')

# Include current Quran figures in individual A4 site cards.
if "['إجمالي المصاحف'" not in text:
    anchor = '''      const infoItems = [
        ['الاسم', site.name],
'''
    replacement = '''      const quranInventory = quranLatestBySite[site.id] as MosqueQuranInventory | null | undefined;
      const infoItems = [
        ['الاسم', site.name],
'''
    text = replace_once(text, anchor, replacement, 'Quran print card lookup')
    anchor2 = "        ['الإحداثيات', coordinates],\n      ];"
    replacement2 = "        ['الإحداثيات', coordinates],\n        ['إجمالي المصاحف', quranInventory?.totalCount?.toLocaleString('ar-SA') || 'لم يتم الجرد'],\n        ['مصاحف كبيرة', quranInventory?.largeCount?.toLocaleString('ar-SA') || '-'],\n        ['مصاحف متوسطة', quranInventory?.mediumCount?.toLocaleString('ar-SA') || '-'],\n        ['مصاحف صغيرة', quranInventory?.smallCount?.toLocaleString('ar-SA') || '-'],\n        ['المصاحف التالفة', quranInventory?.damagedCount?.toLocaleString('ar-SA') || '-'],\n        ['الاحتياج الحالي', quranInventory?.neededCount?.toLocaleString('ar-SA') || '-'],\n      ];"
    text = replace_once(text, anchor2, replacement2, 'Quran print card fields')

# Add Quran inventory sheet to Excel report.
if "'حصر المصاحف'" not in text:
    anchor = "      XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(data.jobs || []), 'التوظيف');\n"
    addition = anchor + "      XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(quranInventoryItems.map((item) => ({ الموقع: item.site.name, النوع: siteTypeDisplayLabel(item.site as MosqueSite), كبير: item.latest?.largeCount || 0, متوسط: item.latest?.mediumCount || 0, صغير: item.latest?.smallCount || 0, الإجمالي: item.latest?.totalCount || 0, تالف: item.latest?.damagedCount || 0, الاحتياج: item.latest?.neededCount || 0, 'آخر جرد': item.latest?.countedAt ? new Date(item.latest.countedAt).toLocaleDateString('ar-SA-u-ca-gregory') : 'لم يجرد' }))), 'حصر المصاحف');\n"
    text = replace_once(text, anchor, addition, 'Quran Excel sheet')

# Dashboard stats.
if 'title="إجمالي المصاحف"' not in text:
    text = replace_once(text, '      {role === \'head\' && <div className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-8">\n', '      {role === \'head\' && <div className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-9">\n', 'head stat grid')
    anchor = '        <Stat title="المساجد والمصليات" value={dashboard?.stats.sites || 0} icon={Building2} onClick={() => goToDashboardSection(\'sites\')} />\n'
    text = replace_once(text, anchor, anchor + '        <Stat title="إجمالي المصاحف" value={quranSummary.total || 0} icon={BookOpen} onClick={() => goToDashboardSection(\'quran\')} />\n', 'head Quran stat')
    text = replace_once(text, '      {role === \'supervisor\' && <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">\n', '      {role === \'supervisor\' && <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-7">\n', 'supervisor stat grid')
    anchor = '        <Stat title="المساجد التابعة لي" value={dashboard?.stats.managedSites || 0} icon={Building2} />\n'
    text = replace_once(text, anchor, anchor + '        <Stat title="إجمالي المصاحف" value={quranSummary.total || 0} icon={BookOpen} onClick={() => goToDashboardSection(\'quran\')} />\n', 'supervisor Quran stat')
    text = replace_once(text, '      {role === \'personnel\' && <div className="grid grid-cols-2 gap-3 md:grid-cols-5">\n', '      {role === \'personnel\' && <div className="grid grid-cols-2 gap-3 md:grid-cols-6">\n', 'personnel stat grid')
    anchor = '        <Stat title="الموقع المرتبط" value={linkedSite ? 1 : 0} icon={Building2} />\n'
    text = replace_once(text, anchor, anchor + '        <Stat title="مصاحف الموقع" value={quranSummary.total || 0} icon={BookOpen} onClick={() => goToDashboardSection(\'quran\')} />\n', 'personnel Quran stat')

# Tab trigger.
if '<TabsTrigger value="quran">' not in text:
    anchor = '          <TabsTrigger value="sites">المساجد والمصليات</TabsTrigger>\n'
    text = replace_once(text, anchor, anchor + '          {[\'head\', \'supervisor\', \'personnel\'].includes(role) && <TabsTrigger value="quran">المصاحف</TabsTrigger>}\n', 'Quran tab trigger')

# Pass Quran data into each mosque/prayer-room card.
if 'quranInventory={quranLatestBySite[site.id]' not in text:
    old = 'onQr={() => setQrSite(site)} />)}</div>}\n'
    new = 'onQr={() => setQrSite(site)} quranInventory={quranLatestBySite[site.id] as MosqueQuranInventory | null | undefined} />)}</div>}\n'
    text = replace_once(text, old, new, 'SiteCard Quran prop')

# Quran tab content before map.
if '<TabsContent value="quran"' not in text:
    anchor = '        <TabsContent value="map" className="space-y-4">\n'
    content = r'''        <TabsContent value="quran" className="space-y-4">
          <Card className={`${card3d} overflow-hidden`}>
            <CardHeader className="gap-3 border-b border-emerald-100 bg-gradient-to-l from-emerald-50 via-white to-sky-50 md:flex-row md:items-center md:justify-between">
              <div><CardTitle className="flex items-center gap-2"><BookOpen className="h-5 w-5 text-emerald-700" />إدارة وحصر المصاحف</CardTitle><CardDescription>جرد دوري للمصاحف الكبيرة والمتوسطة والصغيرة مع متابعة التالف والاحتياج والاحتفاظ بسجل تاريخي لكل مسجد ومصلى.</CardDescription></div>
              {canPrint && <Button variant="outline" className={button3d} onClick={printQuranInventory}><Printer className="ml-2 h-4 w-4" />طباعة / PDF</Button>}
            </CardHeader>
            <CardContent className="space-y-4 pt-5">
              <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
                <ReportMetric label="إجمالي المصاحف" value={quranSummary.total} />
                <ReportMetric label="المصاحف الكبيرة" value={quranSummary.large} />
                <ReportMetric label="المصاحف المتوسطة" value={quranSummary.medium} />
                <ReportMetric label="المصاحف الصغيرة" value={quranSummary.small} />
                <ReportMetric label="التالفة" value={quranSummary.damaged} />
                <ReportMetric label="الاحتياج الحالي" value={quranSummary.needed} />
              </div>
              <div className="grid gap-3 rounded-2xl border border-slate-200 bg-slate-50/70 p-3 md:grid-cols-[1fr_220px_auto] md:items-center">
                <div className="relative"><Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><Input className="h-11 pr-10" value={quranSearch} onChange={(e) => setQuranSearch(e.target.value)} placeholder="بحث باسم المسجد أو المصلى أو المدينة أو الموقع..." /></div>
                <label className={`flex h-11 cursor-pointer items-center justify-center gap-2 rounded-xl border px-3 text-sm font-bold ${quranNeedOnly ? 'border-amber-300 bg-amber-50 text-amber-800' : 'border-slate-200 bg-white text-slate-600'}`}><input type="checkbox" className="h-4 w-4 accent-amber-600" checked={quranNeedOnly} onChange={(e) => setQuranNeedOnly(e.target.checked)} />المواقع التي لديها احتياج فقط</label>
                <Badge variant="outline" className="h-9 justify-center border-sky-200 bg-white px-3">تم جرد {quranSummary.countedSites} من {quranSummary.sites}</Badge>
              </div>
              <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
                <table className="w-full min-w-[980px] text-sm">
                  <thead className="bg-sky-50 text-slate-700"><tr><th className="p-3 text-right">المسجد / المصلى</th><th className="p-3 text-center">كبيرة</th><th className="p-3 text-center">متوسطة</th><th className="p-3 text-center">صغيرة</th><th className="p-3 text-center">الإجمالي</th><th className="p-3 text-center">تالفة</th><th className="p-3 text-center">الاحتياج</th><th className="p-3 text-center">آخر جرد</th><th className="p-3 text-center">الإجراءات</th></tr></thead>
                  <tbody>{filteredQuranInventoryItems.map((item) => {
                    const site = sites.find((row) => row.id === item.site.id) || item.site as MosqueSite;
                    const latest = item.latest;
                    return <tr key={item.site.id} className="border-t border-slate-100 hover:bg-slate-50/60"><td className="p-3"><p className="font-black text-slate-800">{item.site.name}</p><p className="mt-1 text-xs text-muted-foreground">{siteTypeDisplayLabel(item.site as MosqueSite)} — {item.site.campusLocation || item.site.city || '-'}</p></td><td className="p-3 text-center font-bold">{latest?.largeCount ?? 0}</td><td className="p-3 text-center font-bold">{latest?.mediumCount ?? 0}</td><td className="p-3 text-center font-bold">{latest?.smallCount ?? 0}</td><td className="p-3 text-center text-lg font-black text-emerald-700">{latest?.totalCount ?? 0}</td><td className="p-3 text-center font-bold text-red-600">{latest?.damagedCount ?? 0}</td><td className="p-3 text-center font-bold text-amber-700">{latest?.neededCount ?? 0}</td><td className="p-3 text-center text-xs">{latest ? new Date(latest.countedAt).toLocaleDateString('ar-SA-u-ca-gregory') : <Badge variant="outline">لم يجرد</Badge>}</td><td className="p-3"><div className="flex justify-center gap-2"><Button size="sm" variant="outline" className={button3d} onClick={() => openQuranInventoryDialog(site)}><Pencil className="ml-1 h-3.5 w-3.5" />تحديث الجرد</Button><Button size="sm" variant="outline" className={button3d} onClick={() => openQuranHistory(site)}><Clock3 className="ml-1 h-3.5 w-3.5" />السجل</Button></div></td></tr>;
                  })}</tbody>
                </table>
              </div>
              {!filteredQuranInventoryItems.length && <Empty text="لا توجد مواقع مطابقة لبحث حصر المصاحف" />}
              <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 px-4 py-3 text-xs leading-6 text-emerald-900">ملاحظة محاسبية للجرد: <strong>إجمالي المصاحف = كبيرة + متوسطة + صغيرة</strong>. عدد المصاحف التالفة يعتبر جزءًا من هذا الإجمالي ويظهر كمؤشر حالة، بينما «الاحتياج» هو العدد المطلوب توفيره للموقع.</div>
            </CardContent>
          </Card>
        </TabsContent>

'''
    text = replace_once(text, anchor, content + anchor, 'Quran tab content')

# Quran dialogs before request dialog.
if '<Dialog open={quranDialog}' not in text:
    anchor = '      <Dialog open={requestDialog} onOpenChange={setRequestDialog}>\n'
    dialogs = r'''      <Dialog open={quranDialog} onOpenChange={setQuranDialog}>
        <DialogContent className="max-h-[92vh] overflow-hidden p-0 gap-0 border-emerald-200/80 bg-gradient-to-br from-white via-emerald-50/25 to-sky-50/25 sm:max-w-[860px]" dir="rtl">
          <DialogHeader className="border-b border-emerald-100 bg-gradient-to-l from-emerald-50 via-white to-sky-50 p-5 text-right"><DialogTitle className="flex items-center gap-2 text-xl font-black"><BookOpen className="h-5 w-5 text-emerald-700" />تحديث جرد المصاحف</DialogTitle><DialogDescription>{quranInventorySite?.name || ''} — كل حفظ ينشئ سجل جرد جديدًا ويحافظ على السجلات السابقة.</DialogDescription></DialogHeader>
          <div className="max-h-[calc(92vh-150px)] space-y-5 overflow-y-auto p-5 md:p-6">
            <Card className="border-emerald-200/70"><CardHeader className="pb-3"><CardTitle className="text-base">المصاحف حسب الحجم</CardTitle><CardDescription>أدخل العدد الفعلي الموجود حاليًا بالموقع.</CardDescription></CardHeader><CardContent className="grid gap-4 md:grid-cols-3"><Field label="المصاحف الكبيرة"><Input type="number" min="0" step="1" inputMode="numeric" value={quranForm.largeCount} onChange={(e) => setQuranForm({ ...quranForm, largeCount: e.target.value })} /></Field><Field label="المصاحف المتوسطة"><Input type="number" min="0" step="1" inputMode="numeric" value={quranForm.mediumCount} onChange={(e) => setQuranForm({ ...quranForm, mediumCount: e.target.value })} /></Field><Field label="المصاحف الصغيرة"><Input type="number" min="0" step="1" inputMode="numeric" value={quranForm.smallCount} onChange={(e) => setQuranForm({ ...quranForm, smallCount: e.target.value })} /></Field></CardContent></Card>
            <Card className="border-amber-200/70"><CardHeader className="pb-3"><CardTitle className="text-base">الحالة والاحتياج</CardTitle></CardHeader><CardContent className="grid gap-4 md:grid-cols-3"><Field label="المصاحف التالفة"><Input type="number" min="0" step="1" inputMode="numeric" value={quranForm.damagedCount} onChange={(e) => setQuranForm({ ...quranForm, damagedCount: e.target.value })} /></Field><Field label="المطلوب توفيره"><Input type="number" min="0" step="1" inputMode="numeric" value={quranForm.neededCount} onChange={(e) => setQuranForm({ ...quranForm, neededCount: e.target.value })} /></Field><Field label="تاريخ الجرد"><Input type="date" value={quranForm.countedAt} onChange={(e) => setQuranForm({ ...quranForm, countedAt: e.target.value })} /></Field></CardContent></Card>
            <div className="grid grid-cols-2 gap-3 rounded-2xl border border-emerald-200 bg-emerald-50/60 p-4 sm:grid-cols-4"><Info label="الإجمالي الحالي" value={(Number(quranForm.largeCount || 0) + Number(quranForm.mediumCount || 0) + Number(quranForm.smallCount || 0)).toLocaleString('ar-SA')} /><Info label="الكبيرة" value={Number(quranForm.largeCount || 0).toLocaleString('ar-SA')} /><Info label="المتوسطة" value={Number(quranForm.mediumCount || 0).toLocaleString('ar-SA')} /><Info label="الصغيرة" value={Number(quranForm.smallCount || 0).toLocaleString('ar-SA')} /></div>
            <Field label="ملاحظات الجرد"><Textarea rows={4} value={quranForm.notes} onChange={(e) => setQuranForm({ ...quranForm, notes: e.target.value })} placeholder="مثال: استبعاد مصاحف تالفة، حاجة إلى توفير مصاحف إضافية، موقع التخزين..." /></Field>
          </div>
          <DialogFooter className="border-t border-emerald-100 bg-white/95 p-4 md:px-6"><Button variant="outline" className={button3d} onClick={() => setQuranDialog(false)}>إلغاء</Button><Button className={'min-w-36 ' + button3d} onClick={saveQuranInventory} disabled={saving}><Save className="ml-2 h-4 w-4" />{saving ? 'جاري الحفظ...' : 'حفظ الجرد'}</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(quranHistorySite)} onOpenChange={(open) => !open && setQuranHistorySite(null)}>
        <DialogContent className="max-h-[92vh] overflow-hidden p-0 gap-0 sm:max-w-[1050px]" dir="rtl">
          <DialogHeader className="border-b bg-gradient-to-l from-sky-50 via-white to-emerald-50 p-5 text-right"><DialogTitle className="flex items-center gap-2 text-xl font-black"><Clock3 className="h-5 w-5 text-sky-700" />سجل جرد المصاحف</DialogTitle><DialogDescription>{quranHistorySite?.name || ''} — سجل زمني غير مستبدل لعمليات الجرد السابقة.</DialogDescription></DialogHeader>
          <div className="max-h-[calc(92vh-125px)] overflow-y-auto p-5">{quranHistoryLoading ? <div className="flex items-center justify-center gap-2 py-12"><RefreshCw className="h-5 w-5 animate-spin" />جاري تحميل السجل...</div> : quranHistoryRows.length ? <div className="overflow-x-auto rounded-2xl border"><table className="w-full min-w-[850px] text-sm"><thead className="bg-sky-50"><tr><th className="p-3">تاريخ الجرد</th><th className="p-3">كبيرة</th><th className="p-3">متوسطة</th><th className="p-3">صغيرة</th><th className="p-3">الإجمالي</th><th className="p-3">تالفة</th><th className="p-3">الاحتياج</th><th className="p-3">مسجل الجرد</th><th className="p-3">ملاحظات</th></tr></thead><tbody>{quranHistoryRows.map((row) => <tr key={row.id} className="border-t"><td className="p-3 text-center">{new Date(row.countedAt).toLocaleDateString('ar-SA-u-ca-gregory')}</td><td className="p-3 text-center">{row.largeCount}</td><td className="p-3 text-center">{row.mediumCount}</td><td className="p-3 text-center">{row.smallCount}</td><td className="p-3 text-center font-black text-emerald-700">{row.totalCount}</td><td className="p-3 text-center text-red-600">{row.damagedCount}</td><td className="p-3 text-center text-amber-700">{row.neededCount}</td><td className="p-3 text-center">{row.countedByName || '-'}</td><td className="max-w-[260px] p-3 text-xs leading-5">{row.notes || '-'}</td></tr>)}</tbody></table></div> : <Empty text="لا يوجد سجل جرد سابق لهذا الموقع" />}</div>
        </DialogContent>
      </Dialog>

'''
    text = replace_once(text, anchor, dialogs + anchor, 'Quran dialogs')

# SiteCard component: show current Quran counts.
if 'quranInventory?: MosqueQuranInventory' not in text:
    old_sig = '''const SiteCard = ({ site, canEdit, canDelete, canPrint, onPreview, onPrint, onEdit, onDelete, onQr }: { site: MosqueSite; canEdit: boolean; canDelete: boolean; canPrint: boolean; onPreview: () => void; onPrint: () => void; onEdit: () => void; onDelete: () => void; onQr: () => void }) => <Card'''
    new_sig = '''const SiteCard = ({ site, canEdit, canDelete, canPrint, onPreview, onPrint, onEdit, onDelete, onQr, quranInventory }: { site: MosqueSite; canEdit: boolean; canDelete: boolean; canPrint: boolean; onPreview: () => void; onPrint: () => void; onEdit: () => void; onDelete: () => void; onQr: () => void; quranInventory?: MosqueQuranInventory | null }) => <Card'''
    text = replace_once(text, old_sig, new_sig, 'SiteCard signature')
    anchor = '''<Info label="البلاغات" value={site._count?.tickets || 0} /></div><div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">'''
    replacement = '''<Info label="البلاغات" value={site._count?.tickets || 0} /></div><div className="mb-4 rounded-2xl border border-emerald-200 bg-emerald-50/55 p-3"><div className="flex items-center justify-between gap-2"><div className="flex items-center gap-2 text-sm font-black text-emerald-900"><BookOpen className="h-4 w-4" />المصاحف</div><Badge variant="outline" className="border-emerald-200 bg-white text-emerald-800">{quranInventory ? `${quranInventory.totalCount} مصحف` : 'لم يتم الجرد'}</Badge></div>{quranInventory && <div className="mt-2 grid grid-cols-4 gap-2 text-center text-xs"><div><span className="text-muted-foreground">كبير</span><b className="mr-1">{quranInventory.largeCount}</b></div><div><span className="text-muted-foreground">متوسط</span><b className="mr-1">{quranInventory.mediumCount}</b></div><div><span className="text-muted-foreground">صغير</span><b className="mr-1">{quranInventory.smallCount}</b></div><div><span className="text-muted-foreground">احتياج</span><b className="mr-1 text-amber-700">{quranInventory.neededCount}</b></div></div>}</div><div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">'''
    text = replace_once(text, anchor, replacement, 'SiteCard Quran section')

page_path.write_text(text, encoding='utf-8')
print('Mosque Quran inventory frontend UI applied.')
