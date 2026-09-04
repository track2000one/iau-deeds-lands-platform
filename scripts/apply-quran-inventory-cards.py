from pathlib import Path

path = Path('src/app/pages/MosquesUnitPage.tsx')
text = path.read_text(encoding='utf-8')

start_marker = '''              <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">\n                <table className="w-full min-w-[1220px] text-sm">'''
end_marker = '''              {!filteredQuranInventoryItems.length && <Empty text="لا توجد مواقع مطابقة لبحث حصر المصاحف" />}'''

start = text.find(start_marker)
if start == -1:
    raise SystemExit('Quran inventory table start marker not found')
end = text.find(end_marker, start)
if end == -1:
    raise SystemExit('Quran inventory table end marker not found')

new_block = '''              <div className="grid gap-4 xl:grid-cols-2">
                {filteredQuranInventoryItems.map((item) => {
                  const site = sites.find((row) => row.id === item.site.id) || item.site as MosqueSite;
                  const latest = item.latest;
                  const stockRow = quranStockDashboard?.sites.find((row) => row.site.id === item.site.id);
                  const systemStock = stockRow?.systemStock;
                  const withdrawnStock = stockRow?.withdrawnStock;
                  const largeCount = systemStock?.largeCount ?? latest?.largeCount ?? 0;
                  const mediumCount = systemStock?.mediumCount ?? latest?.mediumCount ?? 0;
                  const smallCount = systemStock?.smallCount ?? latest?.smallCount ?? 0;
                  const totalCount = systemStock?.totalCount ?? latest?.totalCount ?? 0;
                  const needCount = Number(stockRow?.needCount || 0);
                  const baselineCounted = Boolean(quranOpeningBaselineStatus?.items.find((row) => row.site.id === site.id)?.counted);
                  const canManageTarget = canEdit && ['head', 'supervisor'].includes(role);
                  const canManageBaseline = role === 'head' && quranOpeningBaselineStatus && !quranOpeningBaselineStatus.closed;
                  const coverageClass = stockRow?.needLevel === 'complete'
                    ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                    : stockRow?.needLevel === 'low'
                      ? 'border-amber-200 bg-amber-50 text-amber-800'
                      : stockRow?.needLevel === 'medium'
                        ? 'border-orange-200 bg-orange-50 text-orange-800'
                        : 'border-red-200 bg-red-50 text-red-700';

                  return <Card key={item.site.id} className={`${card3d} overflow-hidden rounded-2xl`}>
                    <CardContent className="p-4 sm:p-5">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex min-w-0 items-start gap-3">
                          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-sky-100 bg-sky-50 text-sky-700">
                            <Building2 className="h-5 w-5" />
                          </div>
                          <div className="min-w-0">
                            <p className="truncate text-base font-black text-slate-900 sm:text-lg">{item.site.name}</p>
                            <p className="mt-1 flex items-start gap-1 text-xs leading-5 text-slate-500">
                              <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                              <span>{siteTypeDisplayLabel(item.site as MosqueSite)} — {item.site.campusLocation || item.site.city || '-'}</span>
                            </p>
                          </div>
                        </div>
                        {needCount > 0
                          ? <Badge variant="outline" className="shrink-0 border-amber-300 bg-amber-50 text-amber-800">احتياج {needCount}</Badge>
                          : <Badge variant="outline" className="shrink-0 border-emerald-300 bg-emerald-50 text-emerald-700">مكتمل</Badge>}
                      </div>

                      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
                        <div className="rounded-xl border border-emerald-100 bg-emerald-50/50 p-3 text-center">
                          <p className="text-[11px] font-bold text-slate-500">الإجمالي</p>
                          <p className="mt-1 text-2xl font-black text-emerald-700">{totalCount}</p>
                        </div>
                        <div className="rounded-xl border border-slate-200 bg-white p-3 text-center">
                          <p className="text-[11px] font-bold text-slate-500">كبيرة</p>
                          <p className="mt-1 text-xl font-black text-slate-800">{largeCount}</p>
                        </div>
                        <div className="rounded-xl border border-slate-200 bg-white p-3 text-center">
                          <p className="text-[11px] font-bold text-slate-500">متوسطة</p>
                          <p className="mt-1 text-xl font-black text-slate-800">{mediumCount}</p>
                        </div>
                        <div className="rounded-xl border border-slate-200 bg-white p-3 text-center">
                          <p className="text-[11px] font-bold text-slate-500">صغيرة</p>
                          <p className="mt-1 text-xl font-black text-slate-800">{smallCount}</p>
                        </div>
                      </div>

                      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
                        <div className="rounded-xl border border-slate-200 bg-slate-50/70 px-3 py-2 text-center">
                          <p className="text-[10px] font-bold text-slate-500">المسحوبة</p>
                          <p className="mt-1 font-black text-red-600">{withdrawnStock?.totalCount ?? 0}</p>
                        </div>
                        <div className="rounded-xl border border-slate-200 bg-slate-50/70 px-3 py-2 text-center">
                          <p className="text-[10px] font-bold text-slate-500">المستهدف</p>
                          <p className="mt-1 font-black text-slate-800">{stockRow?.targetCount ? stockRow.targetCount : 'غير محدد'}</p>
                        </div>
                        <div className={`rounded-xl border px-3 py-2 text-center ${stockRow?.coveragePercent != null ? coverageClass : 'border-slate-200 bg-slate-50/70 text-slate-500'}`}>
                          <p className="text-[10px] font-bold opacity-80">التغطية</p>
                          <p className="mt-1 font-black">{stockRow?.coveragePercent != null ? `${stockRow.coveragePercent}%` : '-'}</p>
                        </div>
                        <div className={`rounded-xl border px-3 py-2 text-center ${needCount > 0 ? 'border-amber-200 bg-amber-50 text-amber-800' : 'border-emerald-200 bg-emerald-50 text-emerald-700'}`}>
                          <p className="text-[10px] font-bold opacity-80">الاحتياج</p>
                          <p className="mt-1 font-black">{needCount}</p>
                        </div>
                        <div className="col-span-2 rounded-xl border border-slate-200 bg-slate-50/70 px-3 py-2 text-center sm:col-span-1">
                          <p className="text-[10px] font-bold text-slate-500">آخر جرد</p>
                          <p className="mt-1 text-xs font-black text-slate-700">{latest ? new Date(latest.countedAt).toLocaleDateString('ar-SA-u-ca-gregory') : 'لم يجرد'}</p>
                        </div>
                      </div>

                      <div className="mt-4 border-t border-slate-100 pt-4">
                        {(canManageTarget || canManageBaseline) && <div className={`grid gap-2 ${canManageTarget && canManageBaseline ? 'grid-cols-2' : 'grid-cols-1'}`}>
                          {canManageTarget && <Button size="sm" variant="outline" className={`${button3d} h-11 border-sky-200 bg-sky-50 text-sky-800 hover:bg-sky-100`} onClick={() => openSiteDialog(site)}><Pencil className="ml-1 h-4 w-4" />ضبط المستهدف</Button>}
                          {canManageBaseline && <Button size="sm" className={`${button3d} h-11 border border-slate-300 bg-slate-100 text-slate-800 hover:bg-slate-200 hover:text-slate-900`} onClick={() => openQuranOpeningBaselineForSite(site)}><ClipboardList className="ml-1 h-4 w-4" />{baselineCounted ? 'تحديث الجرد التأسيسي' : 'الجرد التأسيسي'}</Button>}
                        </div>}
                        {role === 'head' && <Button size="sm" className={`${button3d} mt-2 h-12 w-full border border-emerald-700 bg-emerald-700 text-white hover:bg-emerald-600`} onClick={() => openQuranDistributionForSite(site)}><BookOpen className="ml-1 h-4 w-4" />إضافة مصحف من المكتبة</Button>}
                        <div className={`mt-2 grid gap-2 ${role === 'head' ? 'grid-cols-2' : 'grid-cols-1'}`}>
                          {role === 'head' && <Button size="sm" className={`${button3d} h-11 border border-amber-300 bg-amber-50 text-amber-800 hover:bg-amber-100 hover:text-amber-900`} onClick={() => openQuranWithdrawalForSite(site)}><RefreshCw className="ml-1 h-4 w-4" />سحب مصاحف</Button>}
                          <Button size="sm" variant="outline" className={`${button3d} h-11`} onClick={() => openQuranHistory(site)}><Clock3 className="ml-1 h-4 w-4" />السجل</Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>;
                })}
              </div>
'''

text = text[:start] + new_block + text[end:]
path.write_text(text, encoding='utf-8')
print('Replaced Quran inventory table with responsive card layout')
