import fs from 'node:fs';

const file = 'src/app/pages/MosquesUnitPage.tsx';
let source = fs.readFileSync(file, 'utf8');

if (source.includes('QURAN_LIVE_SEARCH_CARDS_V2')) {
  console.log('Professional Quran live-search cards already applied.');
  process.exit(0);
}

const startToken = '        {/* QURAN_LIVE_SEARCH_CARDS_V1: show matching mosque/prayer-room cards immediately while typing. */}';
const endToken = '\n\n      {role === \'head\' && <div className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-9">';
const start = source.indexOf(startToken);
const end = source.indexOf(endToken, start);

if (start === -1 || end === -1) {
  throw new Error('Could not locate the current Quran live-search block.');
}

const replacement = String.raw`        {/* QURAN_LIVE_SEARCH_CARDS_V2: compact professional results directly below the search field. */}
        {activeTab === 'quran' && quranSearch.trim() && <section className="overflow-hidden rounded-2xl border-2 border-sky-200 bg-white shadow-[0_12px_30px_rgba(14,165,233,0.12)]">
          <div className="flex flex-col gap-3 border-b border-sky-100 bg-gradient-to-l from-sky-100/90 via-sky-50 to-white px-4 py-3 md:flex-row md:items-center md:justify-between">
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-sky-200 bg-white text-sky-700 shadow-sm">
                <Search className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-sm font-black text-slate-900">نتائج البحث المباشر</p>
                  <Badge variant="outline" className="border-sky-300 bg-white text-sky-800">{filteredQuranInventoryItems.length} نتيجة</Badge>
                </div>
                <p className="mt-0.5 truncate text-xs font-medium text-slate-500">بطاقات المواقع المطابقة تظهر فورًا أثناء الكتابة دون الحاجة للنزول في الصفحة.</p>
              </div>
            </div>
            <Button type="button" size="sm" variant="outline" className={button3d + ' h-9 shrink-0 border-slate-200 bg-white text-slate-600 hover:bg-slate-50'} onClick={() => setQuranSearch('')}>
              <X className="ml-1 h-4 w-4" />مسح البحث
            </Button>
          </div>

          {filteredQuranInventoryItems.length ? <div className="grid gap-2 p-3 lg:grid-cols-2">
            {filteredQuranInventoryItems.slice(0, 6).map((item, index) => {
              const site = sites.find((row) => row.id === item.site.id) || item.site as MosqueSite;
              const stockRow = quranStockDashboard?.sites.find((row) => row.site.id === item.site.id);
              const totalCount = stockRow?.systemStock?.totalCount ?? item.latest?.totalCount ?? 0;
              const needCount = Number(stockRow?.needCount || 0);
              return <div key={'quick-' + item.site.id} className={'group rounded-xl border p-3 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md ' + (index === 0 ? 'border-sky-300 bg-sky-50/60 shadow-sm' : 'border-slate-200 bg-white hover:border-sky-200 hover:bg-sky-50/30')}>
                <div className="flex items-start gap-3">
                  <div className={'flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border shadow-sm ' + (item.site.siteType === 'prayer_room' ? 'border-violet-200 bg-violet-50 text-violet-700' : 'border-emerald-200 bg-emerald-50 text-emerald-700')}>
                    <Building2 className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="min-w-0 flex-1 truncate text-sm font-black text-slate-900">{item.site.name}</p>
                      {index === 0 && <Badge className="shrink-0 bg-sky-600 text-white">الأقرب للبحث</Badge>}
                    </div>
                    <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] font-bold text-slate-500">
                      <span className="inline-flex items-center gap-1"><Building2 className="h-3.5 w-3.5" />{siteTypeDisplayLabel(item.site as MosqueSite)}</span>
                      <span className="inline-flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />{item.site.campusLocation || item.site.city || 'الموقع غير محدد'}</span>
                    </div>
                  </div>
                </div>

                <div className="mt-3 grid grid-cols-2 gap-2">
                  <div className="rounded-lg border border-emerald-100 bg-emerald-50/70 px-3 py-2">
                    <p className="text-[10px] font-bold text-emerald-700/80">رصيد المصاحف</p>
                    <p className="mt-0.5 text-lg font-black leading-none text-emerald-800">{totalCount}</p>
                  </div>
                  <div className={'rounded-lg border px-3 py-2 ' + (needCount > 0 ? 'border-amber-200 bg-amber-50' : 'border-slate-200 bg-slate-50')}>
                    <p className={'text-[10px] font-bold ' + (needCount > 0 ? 'text-amber-700/80' : 'text-slate-500')}>الاحتياج</p>
                    <p className={'mt-0.5 text-lg font-black leading-none ' + (needCount > 0 ? 'text-amber-800' : 'text-slate-700')}>{needCount}</p>
                  </div>
                </div>

                <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-3">
                  <div>
                    {needCount > 0 ? <Badge variant="outline" className="border-amber-300 bg-amber-50 text-amber-800">يحتاج تزويد</Badge> : <Badge variant="outline" className="border-emerald-300 bg-emerald-50 text-emerald-700">الرصيد مناسب</Badge>}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button type="button" size="sm" variant="outline" className={button3d + ' h-9 border-slate-200 bg-white'} onClick={() => openQuranHistory(site)}><Clock3 className="ml-1 h-4 w-4" />السجل</Button>
                    {role === 'head' && <Button type="button" size="sm" className={button3d + ' h-9 bg-emerald-700 text-white hover:bg-emerald-600'} onClick={() => openQuranDistributionForSite(site)}><BookOpen className="ml-1 h-4 w-4" />إضافة مصحف</Button>}
                  </div>
                </div>
              </div>;
            })}
          </div> : <div className="p-4">
            <div className="rounded-xl border border-dashed border-sky-300 bg-sky-50/60 px-4 py-7 text-center">
              <Search className="mx-auto h-7 w-7 text-sky-400" />
              <p className="mt-2 text-sm font-black text-slate-700">لا توجد نتيجة مطابقة</p>
              <p className="mt-1 text-xs text-slate-500">جرّب اسمًا أقصر، أو ابحث باسم المسجد أو المصلى أو المدينة أو الموقع.</p>
            </div>
          </div>}

          {filteredQuranInventoryItems.length > 6 && <div className="border-t border-sky-100 bg-sky-50/50 px-4 py-2.5 text-center text-xs font-bold text-sky-800">يتم عرض أول 6 نتائج من أصل {filteredQuranInventoryItems.length} — استمر في الكتابة لتضييق النتائج.</div>}
        </section>}`;

source = source.slice(0, start) + replacement + source.slice(end);
fs.writeFileSync(file, source);
console.log('Applied professional Quran live-search cards V2.');
