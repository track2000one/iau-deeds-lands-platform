from pathlib import Path

api = Path('src/app/api/mosques.ts')
text = api.read_text()
old = """    damagedTotal: number;
    siteSystemTotal: number;
    siteNeedTotal: number;"""
new = """    damagedTotal: number;
    adjustmentInTotal: number;
    adjustmentOutTotal: number;
    warehouseInflowTotal: number;
    warehouseOutflowTotal: number;
    warehouseNetMovement: number;
    siteSystemTotal: number;
    systemTotal: number;
    siteNeedTotal: number;"""
if old in text:
    text = text.replace(old, new, 1)
elif 'warehouseInflowTotal: number;' not in text:
    raise SystemExit('Unable to locate MosqueQuranStockDashboard summary type')
api.write_text(text)

page = Path('src/app/pages/MosquesUnitPage.tsx')
text = page.read_text()
old = """              <div className=\"grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-8\">
                <ReportMetric label=\"رصيد المكتبة\" value={quranStockDashboard?.summary.warehouseTotal || 0} />
                <ReportMetric label=\"الكبيرة بالمكتبة\" value={quranStockDashboard?.summary.warehouseLarge || 0} />
                <ReportMetric label=\"المتوسطة بالمكتبة\" value={quranStockDashboard?.summary.warehouseMedium || 0} />
                <ReportMetric label=\"الصغيرة بالمكتبة\" value={quranStockDashboard?.summary.warehouseSmall || 0} />
                <ReportMetric label=\"إجمالي المضاف للمكتبة\" value={quranStockDashboard?.summary.receivedTotal || 0} />
                <ReportMetric label=\"إجمالي المضاف للمواقع\" value={quranStockDashboard?.summary.distributedTotal || 0} />
                <ReportMetric label=\"المرتجع\" value={quranStockDashboard?.summary.returnedTotal || 0} />
                <ReportMetric label=\"احتياج المواقع\" value={quranStockDashboard?.summary.siteNeedTotal || 0} />
              </div>"""
new = """              <div className=\"space-y-4\">
                <div>
                  <div className=\"mb-2 flex flex-wrap items-center justify-between gap-2\"><div><p className=\"text-sm font-black text-slate-800\">الرصيد الحالي</p><p className=\"mt-1 text-[11px] text-slate-500\">يعرض الكميات الموجودة فعليًا الآن في المكتبة والمواقع، وليس مجموع الحركات التاريخية.</p></div><Badge variant=\"outline\" className=\"border-emerald-200 bg-emerald-50 text-emerald-700\">رصيد لحظي</Badge></div>
                  <div className=\"grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-8\">
                    <ReportMetric label=\"رصيد المكتبة الحالي\" value={quranStockDashboard?.summary.warehouseTotal || 0} />
                    <ReportMetric label=\"الكبيرة بالمكتبة\" value={quranStockDashboard?.summary.warehouseLarge || 0} />
                    <ReportMetric label=\"المتوسطة بالمكتبة\" value={quranStockDashboard?.summary.warehouseMedium || 0} />
                    <ReportMetric label=\"الصغيرة بالمكتبة\" value={quranStockDashboard?.summary.warehouseSmall || 0} />
                    <ReportMetric label=\"الرصيد الحالي بالمواقع\" value={quranStockDashboard?.summary.siteSystemTotal || 0} />
                    <ReportMetric label=\"إجمالي الرصيد بالنظام\" value={quranStockDashboard?.summary.systemTotal || 0} />
                    <ReportMetric label=\"احتياج المواقع\" value={quranStockDashboard?.summary.siteNeedTotal || 0} />
                    <ReportMetric label=\"تنبيهات الرصيد\" value={quranStockDashboard?.summary.lowStockWarehouses || 0} />
                  </div>
                </div>

                {quranStockDashboard && <div className=\"rounded-2xl border border-sky-100 bg-sky-50/40 p-4\">
                  <div className=\"mb-3\"><p className=\"text-sm font-black text-slate-800\">ملخص حركة المكتبة</p><p className=\"mt-1 text-[11px] leading-5 text-slate-500\">هذه أرقام تراكمية للحركات المسجلة، لذلك قد تختلف عن الرصيد الحالي. المعادلة أدناه توضح سبب الفرق بصورة مباشرة.</p></div>
                  <div className=\"grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5\">
                    <ReportMetric label=\"إجمالي الوارد للمكتبة\" value={quranStockDashboard.summary.warehouseInflowTotal || 0} />
                    <ReportMetric label=\"إجمالي الخارج من المكتبة\" value={quranStockDashboard.summary.warehouseOutflowTotal || 0} />
                    <ReportMetric label=\"المضاف للمواقع\" value={quranStockDashboard.summary.distributedTotal || 0} />
                    <ReportMetric label=\"المرتجع للمكتبة\" value={quranStockDashboard.summary.returnedTotal || 0} />
                    <ReportMetric label=\"المستبعد / تسويات النقص\" value={(quranStockDashboard.summary.damagedTotal || 0) + (quranStockDashboard.summary.adjustmentOutTotal || 0)} />
                  </div>
                  <div className={`mt-3 rounded-xl border px-3 py-2 text-xs font-bold ${quranStockDashboard.summary.warehouseNetMovement === quranStockDashboard.summary.warehouseTotal ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-red-200 bg-red-50 text-red-800'}`}>
                    معادلة الرصيد: {quranStockDashboard.summary.warehouseInflowTotal || 0} وارد − {quranStockDashboard.summary.warehouseOutflowTotal || 0} خارج = {quranStockDashboard.summary.warehouseNetMovement || 0}، والرصيد الحالي للمكتبة = {quranStockDashboard.summary.warehouseTotal || 0}.
                  </div>
                </div>}
              </div>"""
if old in text:
    text = text.replace(old, new, 1)
elif 'ملخص حركة المكتبة' not in text:
    raise SystemExit('Unable to locate Quran stock metric block')
page.write_text(text)
