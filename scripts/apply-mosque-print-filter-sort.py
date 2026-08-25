from pathlib import Path

path = Path('src/app/pages/MosquesUnitPage.tsx')
text = path.read_text(encoding='utf-8')

# Add Filter icon to match the professional filtering UI used in All Deeds.
if '  Filter,\n' not in text:
    text = text.replace('  FileText,\n  MapPin,', '  FileText,\n  Filter,\n  MapPin,', 1)

state_anchor = "  const [search, setSearch] = useState('');\n  const [activeTab, setActiveTab] = useState('overview');"
state_replacement = """  const [search, setSearch] = useState('');
  const [siteFilterCity, setSiteFilterCity] = useState('');
  const [siteFilterType, setSiteFilterType] = useState('all');
  const [siteFilterStatus, setSiteFilterStatus] = useState('all');
  const [siteSortBy, setSiteSortBy] = useState('name');
  const [siteSortDirection, setSiteSortDirection] = useState<'asc' | 'desc'>('asc');
  const [activeTab, setActiveTab] = useState('overview');"""
if state_anchor not in text:
    raise SystemExit('state anchor not found')
text = text.replace(state_anchor, state_replacement, 1)

visible_anchor = """  const visibleSites = useMemo(() => {
    const q = search.trim().toLowerCase();
    const base = role === 'personnel' && linkedSiteId ? sites.filter((site) => site.id === linkedSiteId) : sites;
    if (!q) return base;
    return base.filter((site) => [site.name, site.city, site.district, site.campusLocation].filter(Boolean).some((v) => String(v).toLowerCase().includes(q)));
  }, [sites, search, role, linkedSiteId]);

  const mapSites = useMemo(() => visibleSites.filter((site) => Number.isFinite(Number(site.latitude)) && Number.isFinite(Number(site.longitude))), [visibleSites]);"""
visible_replacement = """  const siteCities = useMemo(
    () => Array.from(new Set(sites.map((site) => site.city).filter(Boolean) as string[])).sort((a, b) => a.localeCompare(b, 'ar')),
    [sites]
  );

  const visibleSites = useMemo(() => {
    const q = search.trim().toLowerCase();
    let result = role === 'personnel' && linkedSiteId ? sites.filter((site) => site.id === linkedSiteId) : [...sites];

    if (q) {
      result = result.filter((site) =>
        [site.name, site.city, site.district, site.campusLocation, site.imamName, site.muezzinName, site.khateebName]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(q))
      );
    }
    if (siteFilterCity) result = result.filter((site) => site.city === siteFilterCity);
    if (siteFilterType !== 'all') result = result.filter((site) => site.siteType === siteFilterType);
    if (siteFilterStatus !== 'all') result = result.filter((site) => site.status === siteFilterStatus);

    const buildingCode = (site: MosqueSite) => String(site.campusLocation || '').match(/\\b(?:M|A|H)\\d+\\b/i)?.[0]?.toUpperCase() || '';
    const textValue = (site: MosqueSite) => {
      if (siteSortBy === 'building') return buildingCode(site);
      if (siteSortBy === 'city') return site.city || '';
      if (siteSortBy === 'type') return siteTypeLabels[site.siteType] || site.siteType || '';
      if (siteSortBy === 'status') return siteStatusLabels[site.status] || site.status || '';
      return site.name || '';
    };

    result.sort((a, b) => {
      let compared = 0;
      if (siteSortBy === 'area') compared = Number(a.area || 0) - Number(b.area || 0);
      else compared = textValue(a).localeCompare(textValue(b), 'ar', { numeric: true, sensitivity: 'base' });
      if (compared === 0) compared = (a.name || '').localeCompare(b.name || '', 'ar', { numeric: true, sensitivity: 'base' });
      return siteSortDirection === 'desc' ? compared * -1 : compared;
    });

    return result;
  }, [sites, search, role, linkedSiteId, siteFilterCity, siteFilterType, siteFilterStatus, siteSortBy, siteSortDirection]);

  const siteFilterStats = useMemo(() => ({
    total: visibleSites.length,
    mosques: visibleSites.filter((site) => site.siteType === 'mosque' || site.siteType === 'jami').length,
    prayerRooms: visibleSites.filter((site) => site.siteType === 'prayer_room').length,
    totalArea: visibleSites.reduce((sum, site) => sum + (Number(site.area) || 0), 0),
  }), [visibleSites]);

  const resetSiteFilters = () => {
    setSearch('');
    setSiteFilterCity('');
    setSiteFilterType('all');
    setSiteFilterStatus('all');
    setSiteSortBy('name');
    setSiteSortDirection('asc');
  };

  const mapSites = useMemo(() => visibleSites.filter((site) => Number.isFinite(Number(site.latitude)) && Number.isFinite(Number(site.longitude))), [visibleSites]);"""
if visible_anchor not in text:
    raise SystemExit('visibleSites anchor not found')
text = text.replace(visible_anchor, visible_replacement, 1)

filter_note_anchor = "    const filterNote = search.trim() ? ' — نتائج البحث/التصفية الحالية' : '';"
filter_note_replacement = """    const sortLabels: Record<string, string> = { name: 'الاسم', building: 'رقم المبنى', city: 'المدينة', type: 'النوع', status: 'الحالة', area: 'المساحة' };
    const filterParts = [
      search.trim() ? `بحث: ${search.trim()}` : null,
      siteFilterCity ? `المدينة: ${siteFilterCity}` : null,
      siteFilterType !== 'all' ? `النوع: ${siteTypeLabels[siteFilterType] || siteFilterType}` : null,
      siteFilterStatus !== 'all' ? `الحالة: ${siteStatusLabels[siteFilterStatus] || siteFilterStatus}` : null,
      `الفرز: ${sortLabels[siteSortBy] || siteSortBy} — ${siteSortDirection === 'asc' ? 'تصاعدي' : 'تنازلي'}`,
    ].filter(Boolean) as string[];
    const filterNote = filterParts.join(' | ');"""
if filter_note_anchor not in text:
    raise SystemExit('print filter note anchor not found')
text = text.replace(filter_note_anchor, filter_note_replacement, 1)

css_anchor = "    .meta { margin-top: 2mm; color: #66788a; font-size: 8px; display: flex; justify-content: space-between; gap: 5mm; }"
css_replacement = css_anchor + "\n    .filters { margin-top: 2.5mm; padding: 2mm 2.5mm; border: 1px solid #dbe7ef; border-radius: 2mm; background: #f8fbfd; color: #50677a; font-size: 8px; line-height: 1.6; }"
if css_anchor not in text:
    raise SystemExit('print css anchor not found')
text = text.replace(css_anchor, css_replacement, 1)

meta_anchor = '    <div class="meta"><span>عدد السجلات: ${rows.length}${filterNote}</span><span>تاريخ الاستخراج: ${escapeHtml(generatedAt)}</span></div>'
meta_replacement = '    <div class="meta"><span>عدد السجلات: ${rows.length}</span><span>تاريخ الاستخراج: ${escapeHtml(generatedAt)}</span></div>\n    <div class="filters"><strong>معايير التصفية والفرز:</strong> ${escapeHtml(filterNote || \'جميع السجلات — الفرز حسب الاسم تصاعديًا\')}</div>'
if meta_anchor not in text:
    raise SystemExit('print meta anchor not found')
text = text.replace(meta_anchor, meta_replacement, 1)

sites_start_marker = '        <TabsContent value="sites" className="space-y-4">\n'
site_cards_marker = '          {visibleSites.length === 0 ?'
start = text.find(sites_start_marker)
if start < 0:
    raise SystemExit('sites tab start not found')
content_start = start + len(sites_start_marker)
end = text.find(site_cards_marker, content_start)
if end < 0:
    raise SystemExit('sites cards marker not found')

filter_card = r'''          <Card className="overflow-hidden border-sky-200/70 bg-white/85 shadow-[0_18px_55px_rgba(15,23,42,0.08)] backdrop-blur-xl">
            <CardHeader className="border-b border-sky-100/80 bg-gradient-to-l from-sky-50/95 via-white to-violet-50/75 pb-4">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2 text-lg"><Filter className="h-5 w-5 text-sky-700" />التصفية والفرز للطباعة</CardTitle>
                  <CardDescription className="mt-1">حدد السجلات ورتبها كما تريد؛ نفس النتائج الظاهرة هي التي ستُطبع أو تحفظ PDF.</CardDescription>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button variant="outline" className={button3d} onClick={resetSiteFilters}><X className="ml-2 h-4 w-4" />مسح التصفية</Button>
                  {canPrint && visibleSites.length > 0 && <Button className={`${button3d} bg-sky-700 hover:bg-sky-800`} onClick={() => printSitesTable(visibleSites)}><Printer className="ml-2 h-4 w-4" />طباعة / PDF كجدول ({visibleSites.length})</Button>}
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4 p-4 sm:p-5">
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-6">
                <div className="relative md:col-span-2 xl:col-span-2">
                  <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input className="h-11 rounded-xl pr-9" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="بحث بالاسم أو المدينة أو الحي أو الموقع أو الإمام..." />
                  {search && <Button type="button" variant="ghost" size="icon" className="absolute left-1 top-1/2 h-8 w-8 -translate-y-1/2" onClick={() => setSearch('')}><X className="h-4 w-4" /></Button>}
                </div>
                <NativeSelect className="h-11 rounded-xl" value={siteFilterCity} onChange={(e) => setSiteFilterCity(e.target.value)}><option value="">جميع المدن</option>{siteCities.map((city) => <option key={city} value={city}>{city}</option>)}</NativeSelect>
                <NativeSelect className="h-11 rounded-xl" value={siteFilterType} onChange={(e) => setSiteFilterType(e.target.value)}><option value="all">جميع الأنواع</option><option value="mosque">مسجد</option><option value="jami">جامع</option><option value="prayer_room">مصلى</option></NativeSelect>
                <NativeSelect className="h-11 rounded-xl" value={siteFilterStatus} onChange={(e) => setSiteFilterStatus(e.target.value)}><option value="all">جميع الحالات</option><option value="active">نشط</option><option value="maintenance">تحت الصيانة</option><option value="temporarily_closed">مغلق مؤقتًا</option></NativeSelect>
                <NativeSelect className="h-11 rounded-xl" value={siteSortBy} onChange={(e) => setSiteSortBy(e.target.value)}><option value="name">فرز حسب الاسم</option><option value="building">فرز حسب رقم المبنى</option><option value="city">فرز حسب المدينة</option><option value="type">فرز حسب النوع</option><option value="status">فرز حسب الحالة</option><option value="area">فرز حسب المساحة</option></NativeSelect>
              </div>

              <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-slate-50/70 p-3 lg:flex-row lg:items-center lg:justify-between">
                <div className="grid flex-1 grid-cols-2 gap-2 sm:grid-cols-4">
                  <div className="rounded-xl border bg-white px-3 py-2"><p className="text-[11px] text-muted-foreground">السجلات الظاهرة</p><p className="mt-1 text-lg font-black text-slate-800">{siteFilterStats.total.toLocaleString('ar-SA')}</p></div>
                  <div className="rounded-xl border bg-white px-3 py-2"><p className="text-[11px] text-muted-foreground">المساجد والجوامع</p><p className="mt-1 text-lg font-black text-slate-800">{siteFilterStats.mosques.toLocaleString('ar-SA')}</p></div>
                  <div className="rounded-xl border bg-white px-3 py-2"><p className="text-[11px] text-muted-foreground">المصليات</p><p className="mt-1 text-lg font-black text-slate-800">{siteFilterStats.prayerRooms.toLocaleString('ar-SA')}</p></div>
                  <div className="rounded-xl border bg-white px-3 py-2"><p className="text-[11px] text-muted-foreground">إجمالي المساحة</p><p className="mt-1 text-lg font-black text-slate-800">{siteFilterStats.totalArea.toLocaleString('ar-SA', { maximumFractionDigits: 2 })} م²</p></div>
                </div>
                <div className="flex min-w-[190px] items-center gap-2 rounded-xl border bg-white p-2">
                  <span className="whitespace-nowrap text-xs font-semibold text-slate-600">اتجاه الفرز</span>
                  <NativeSelect className="h-9 flex-1" value={siteSortDirection} onChange={(e) => setSiteSortDirection(e.target.value as 'asc' | 'desc')}><option value="asc">تصاعدي ↑</option><option value="desc">تنازلي ↓</option></NativeSelect>
                </div>
              </div>

              {(search || siteFilterCity || siteFilterType !== 'all' || siteFilterStatus !== 'all' || siteSortBy !== 'name' || siteSortDirection !== 'asc') && <div className="flex flex-wrap items-center gap-2 text-xs">
                <span className="font-bold text-slate-600">المعايير الحالية:</span>
                {search && <Badge variant="outline">بحث: {search}</Badge>}
                {siteFilterCity && <Badge variant="outline">المدينة: {siteFilterCity}</Badge>}
                {siteFilterType !== 'all' && <Badge variant="outline">النوع: {siteTypeLabels[siteFilterType]}</Badge>}
                {siteFilterStatus !== 'all' && <Badge variant="outline">الحالة: {siteStatusLabels[siteFilterStatus]}</Badge>}
                <Badge variant="outline">الفرز: {{ name: 'الاسم', building: 'رقم المبنى', city: 'المدينة', type: 'النوع', status: 'الحالة', area: 'المساحة' }[siteSortBy] || siteSortBy} — {siteSortDirection === 'asc' ? 'تصاعدي' : 'تنازلي'}</Badge>
              </div>}
            </CardContent>
          </Card>
'''

text = text[:content_start] + filter_card + text[end:]

path.write_text(text, encoding='utf-8')
print('Mosque print filtering and sorting patch applied successfully.')
