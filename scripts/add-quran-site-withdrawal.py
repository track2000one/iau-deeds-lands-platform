from pathlib import Path

api_path = Path('src/app/api/mosques.ts')
page_path = Path('src/app/pages/MosquesUnitPage.tsx')

api = api_path.read_text(encoding='utf-8')
page = page_path.read_text(encoding='utf-8')
api_original = api
page_original = page

# API typing: a site withdrawal is a ledger movement that reduces only site stock.
api_replacements = [
    (
        "movementType: 'receipt' | 'distribution' | 'return' | 'warehouse_damage' | 'adjustment_in' | 'adjustment_out';",
        "movementType: 'receipt' | 'distribution' | 'return' | 'site_withdrawal' | 'warehouse_damage' | 'adjustment_in' | 'adjustment_out';",
    ),
    (
        "    returnedTotal: number;\n    damagedTotal: number;",
        "    returnedTotal: number;\n    withdrawnTotal: number;\n    damagedTotal: number;",
    ),
    (
        "    systemStock: MosqueQuranStockCount;\n  }> ;",
        "    systemStock: MosqueQuranStockCount;\n    withdrawnStock: MosqueQuranStockCount;\n  }> ;",
    ),
]
# The source currently has no space between }> and ; in some revisions.
if "    systemStock: MosqueQuranStockCount;\n  }> ;" not in api:
    api_replacements[-1] = (
        "    systemStock: MosqueQuranStockCount;\n  }> ;".replace('> ;', '>;'),
        "    systemStock: MosqueQuranStockCount;\n    withdrawnStock: MosqueQuranStockCount;\n  }> ;".replace('> ;', '>;'),
    )

for old, new in api_replacements:
    if old not in api:
        raise SystemExit(f'Missing API pattern: {old}')
    api = api.replace(old, new)

page_replacements = [
    (
        "  return: 'إرجاع إلى مكتبة المصاحف',\n  warehouse_damage: 'سحب مصاحف من المكتبة',",
        "  return: 'إرجاع إلى مكتبة المصاحف',\n  site_withdrawal: 'سحب مصاحف من مسجد / مصلى',\n  warehouse_damage: 'استبعاد مصاحف من المكتبة',",
    ),
    (
        "const emptyQuranStockMovementForm = () => ({ movementType: 'receipt', warehouseId: '', siteId: '', largeCount: '0', mediumCount: '0', smallCount: '0', referenceNumber: '', movementAt: new Date().toISOString().slice(0, 10), notes: '' });",
        "const emptyQuranStockMovementForm = () => ({ movementType: 'receipt', warehouseId: '', siteId: '', largeCount: '0', mediumCount: '0', smallCount: '0', withdrawalReason: '', referenceNumber: '', movementAt: new Date().toISOString().slice(0, 10), notes: '' });",
    ),
    (
        "      const systemStock = quranStockDashboard?.sites.find((row) => row.site.id === item.site.id)?.systemStock;\n      const large = Number(systemStock?.largeCount ?? latest?.largeCount ?? 0);",
        "      const stockRow = quranStockDashboard?.sites.find((row) => row.site.id === item.site.id);\n      const systemStock = stockRow?.systemStock;\n      const large = Number(systemStock?.largeCount ?? latest?.largeCount ?? 0);",
    ),
    (
        "      const damaged = Number(latest?.damagedCount ?? 0);",
        "      const damaged = Number(stockRow?.withdrawnStock?.totalCount ?? 0);",
    ),
    (
        '<ReportMetric label="المسحوبة" value={quranSummary.damaged} />',
        '<ReportMetric label="المسحوبة" value={quranStockDashboard?.summary.withdrawnTotal ?? 0} />',
    ),
    (
        "                    const systemStock = quranStockDashboard?.sites.find((row) => row.site.id === item.site.id)?.systemStock;",
        "                    const stockRow = quranStockDashboard?.sites.find((row) => row.site.id === item.site.id);\n                    const systemStock = stockRow?.systemStock;\n                    const withdrawnStock = stockRow?.withdrawnStock;",
    ),
    (
        "</td><td className=\"p-3 text-center font-bold text-red-600\">{latest?.damagedCount ?? 0}</td><td className=\"p-3 text-center font-bold text-amber-700\">",
        "</td><td className=\"p-3 text-center font-bold text-red-600\">{withdrawnStock?.totalCount ?? 0}</td><td className=\"p-3 text-center font-bold text-amber-700\">",
    ),
    (
        "المسحوبة: item.latest?.damagedCount || 0,",
        "المسحوبة: quranStockDashboard?.sites.find((row) => row.site.id === item.site.id)?.withdrawnStock?.totalCount || 0,",
    ),
    (
        "      const quranInventory = quranLatestBySite[site.id] as MosqueQuranInventory | null | undefined;\n      const infoItems = [",
        "      const quranInventory = quranLatestBySite[site.id] as MosqueQuranInventory | null | undefined;\n      const quranWithdrawn = quranStockDashboard?.sites.find((row) => row.site.id === site.id)?.withdrawnStock?.totalCount || 0;\n      const infoItems = [",
    ),
    (
        "['المصاحف المسحوبة', quranInventory?.damagedCount?.toLocaleString('ar-SA') || '-'],",
        "['المصاحف المسحوبة', quranWithdrawn.toLocaleString('ar-SA')],",
    ),
]

for old, new in page_replacements:
    if old not in page:
        raise SystemExit(f'Missing page pattern: {old[:160]}')
    page = page.replace(old, new)

# Any UI/site-selection checks that previously applied to distribution and return
# now also apply to site withdrawals.
page = page.replace("['distribution', 'return'].includes(", "['distribution', 'return', 'site_withdrawal'].includes(")

# Add a dedicated launcher from the Quran inventory table.
old_distribution_fn = """  const openQuranDistributionForSite = (site: MosqueSite) => {
    const activeWarehouse = quranStockDashboard?.warehouses.find((item) => item.active) || quranStockDashboard?.warehouses[0];
    if (!activeWarehouse) {
      toast.error('لا توجد مكتبة مصاحف مفعّلة لإضافة المصاحف');
      return;
    }
    setQuranStockMovementForm({
      ...emptyQuranStockMovementForm(),
      movementType: 'distribution',
      warehouseId: activeWarehouse.id,
      siteId: site.id,
    });
    setQuranStockMovementDialog(true);
  };
"""
new_distribution_fn = old_distribution_fn + """
  const openQuranWithdrawalForSite = (site: MosqueSite) => {
    const activeWarehouse = quranStockDashboard?.warehouses.find((item) => item.active) || quranStockDashboard?.warehouses[0];
    if (!activeWarehouse) {
      toast.error('لا توجد مكتبة مصاحف مفعّلة لتسجيل حركة السحب');
      return;
    }
    const current = quranStockDashboard?.sites.find((item) => item.site.id === site.id)?.systemStock;
    if (!current?.totalCount) {
      toast.info('لا يوجد رصيد مصاحف في هذا المسجد أو المصلى يمكن سحبه');
      return;
    }
    setQuranStockMovementForm({
      ...emptyQuranStockMovementForm(),
      movementType: 'site_withdrawal',
      warehouseId: activeWarehouse.id,
      siteId: site.id,
    });
    setQuranStockMovementDialog(true);
  };
"""
if old_distribution_fn not in page:
    raise SystemExit('Missing distribution launcher function')
page = page.replace(old_distribution_fn, new_distribution_fn)

# Require a reason and persist it in the immutable movement notes.
old_site_validation = """    if (['distribution', 'return', 'site_withdrawal'].includes(quranStockMovementForm.movementType) && !quranStockMovementForm.siteId) return toast.error('اختر المسجد أو المصلى');
    setQuranStockSaving(true);"""
new_site_validation = """    if (['distribution', 'return', 'site_withdrawal'].includes(quranStockMovementForm.movementType) && !quranStockMovementForm.siteId) return toast.error('اختر المسجد أو المصلى');
    if (quranStockMovementForm.movementType === 'site_withdrawal' && !String(quranStockMovementForm.withdrawalReason || '').trim()) return toast.error('حدد سبب سحب المصاحف من المسجد أو المصلى');
    setQuranStockSaving(true);"""
if old_site_validation not in page:
    raise SystemExit('Missing stock movement validation block')
page = page.replace(old_site_validation, new_site_validation)

old_notes = """        notes: quranStockMovementForm.notes || null,"""
new_notes = """        notes: quranStockMovementForm.movementType === 'site_withdrawal'
          ? `سبب السحب: ${String(quranStockMovementForm.withdrawalReason || '').trim()}${quranStockMovementForm.notes ? `\n${quranStockMovementForm.notes}` : ''}`
          : (quranStockMovementForm.notes || null),"""
if old_notes not in page:
    raise SystemExit('Missing stock movement notes payload')
page = page.replace(old_notes, new_notes, 1)

old_toast = """      toast.success(quranStockMovementForm.movementType === 'distribution' ? 'تمت إضافة المصاحف للموقع وخصمها تلقائيًا من رصيد المكتبة' : quranStockMovementForm.movementType === 'receipt' ? 'تمت إضافة الكمية إلى رصيد مكتبة المصاحف' : 'تم تسجيل حركة المصاحف بنجاح');"""
new_toast = """      toast.success(quranStockMovementForm.movementType === 'distribution'
        ? 'تمت إضافة المصاحف للموقع وخصمها تلقائيًا من رصيد المكتبة'
        : quranStockMovementForm.movementType === 'site_withdrawal'
          ? 'تم سحب المصاحف من رصيد المسجد أو المصلى وتسجيل سبب السحب في السجل'
          : quranStockMovementForm.movementType === 'receipt'
            ? 'تمت إضافة الكمية إلى رصيد مكتبة المصاحف'
            : 'تم تسجيل حركة المصاحف بنجاح');"""
if old_toast not in page:
    raise SystemExit('Missing movement success toast')
page = page.replace(old_toast, new_toast)

# Add the site-withdrawal action next to the existing add-from-library action.
old_actions = """{role === 'head' && <Button size=\"sm\" className={`${button3d} bg-sky-700 hover:bg-sky-600`} onClick={() => openQuranDistributionForSite(site)}><BookOpen className=\"ml-1 h-3.5 w-3.5\" />إضافة مصحف من المكتبة</Button>}<Button size=\"sm\" variant=\"outline\" className={button3d} onClick={() => openQuranHistory(site)}>"""
new_actions = """{role === 'head' && <Button size=\"sm\" className={`${button3d} bg-sky-700 hover:bg-sky-600`} onClick={() => openQuranDistributionForSite(site)}><BookOpen className=\"ml-1 h-3.5 w-3.5\" />إضافة مصحف من المكتبة</Button>}{role === 'head' && <Button size=\"sm\" className={`${button3d} bg-amber-600 hover:bg-amber-500`} onClick={() => openQuranWithdrawalForSite(site)}><RefreshCw className=\"ml-1 h-3.5 w-3.5\" />سحب مصاحف</Button>}<Button size=\"sm\" variant=\"outline\" className={button3d} onClick={() => openQuranHistory(site)}>"""
if old_actions not in page:
    raise SystemExit('Missing Quran inventory row action block')
page = page.replace(old_actions, new_actions)

# Make the movement dialog explicit when performing a withdrawal.
old_header = """<DialogTitle className=\"flex items-center gap-2 text-xl font-black\"><BookOpen className=\"h-5 w-5 text-emerald-700\" />حركة مصاحف المكتبة</DialogTitle><DialogDescription>إضافة الرصيد تزيد رصيد المكتبة، وإضافة المصاحف للموقع تخصمها تلقائيًا من المكتبة، والإرجاع يعيد الكمية إلى المكتبة. لا يتم تعديل الرصيد يدويًا خارج سجل الحركات.</DialogDescription>"""
new_header = """<DialogTitle className=\"flex items-center gap-2 text-xl font-black\"><BookOpen className=\"h-5 w-5 text-emerald-700\" />{quranStockMovementForm.movementType === 'site_withdrawal' ? 'سحب مصاحف من المسجد / المصلى' : 'حركة مصاحف المكتبة'}</DialogTitle><DialogDescription>{quranStockMovementForm.movementType === 'site_withdrawal' ? 'السحب يخصم المصاحف من الرصيد النظامي للموقع ويسجل سبب السحب وتاريخه. المصاحف المسحوبة لا تعاد تلقائيًا إلى رصيد المكتبة المتاح.' : 'إضافة الرصيد تزيد رصيد المكتبة، وإضافة المصاحف للموقع تخصمها تلقائيًا من المكتبة، والإرجاع يعيد الكمية إلى المكتبة. لا يتم تعديل الرصيد يدويًا خارج سجل الحركات.'}</DialogDescription>"""
if old_header not in page:
    raise SystemExit('Missing stock movement dialog header')
page = page.replace(old_header, new_header)

# Insert a mandatory withdrawal reason selector before reference/date fields.
anchor = """            <div className=\"grid gap-4 md:grid-cols-2\"><Field label=\"رقم المرجع / السند\"><Input value={quranStockMovementForm.referenceNumber}"""
insert = """            {quranStockMovementForm.movementType === 'site_withdrawal' && <Field label=\"سبب السحب *\"><NativeSelect value={quranStockMovementForm.withdrawalReason || ''} onChange={(e) => setQuranStockMovementForm({ ...quranStockMovementForm, withdrawalReason: e.target.value })}><option value=\"\">اختر سبب السحب</option><option value=\"قدم المصحف\">قدم المصحف</option><option value=\"تهالك أو تمزق\">تهالك أو تمزق</option><option value=\"عدم ملاءمة النسخة للموقع\">عدم ملاءمة النسخة للموقع</option><option value=\"فائض عن حاجة الموقع\">فائض عن حاجة الموقع</option><option value=\"إعادة تنظيم وتوزيع\">إعادة تنظيم وتوزيع</option><option value=\"أخرى\">أخرى</option></NativeSelect></Field>}
""" + anchor
if anchor not in page:
    raise SystemExit('Missing reference/date field anchor')
page = page.replace(anchor, insert)

old_total_message = """<div className=\"rounded-xl border border-sky-200 bg-sky-50 p-3 text-sm text-sky-900\">إجمالي هذه الحركة: <strong>{(Number(quranStockMovementForm.largeCount || 0) + Number(quranStockMovementForm.mediumCount || 0) + Number(quranStockMovementForm.smallCount || 0)).toLocaleString('ar-SA')} مصحف</strong>{quranStockMovementForm.movementType === 'distribution' && ' — سيتم خصمها تلقائيًا من مكتبة المصاحف وإضافتها إلى رصيد الموقع.'}</div>"""
new_total_message = """<div className=\"rounded-xl border border-sky-200 bg-sky-50 p-3 text-sm text-sky-900\">إجمالي هذه الحركة: <strong>{(Number(quranStockMovementForm.largeCount || 0) + Number(quranStockMovementForm.mediumCount || 0) + Number(quranStockMovementForm.smallCount || 0)).toLocaleString('ar-SA')} مصحف</strong>{quranStockMovementForm.movementType === 'distribution' ? ' — سيتم خصمها تلقائيًا من مكتبة المصاحف وإضافتها إلى رصيد الموقع.' : quranStockMovementForm.movementType === 'site_withdrawal' ? ' — سيتم خصمها من رصيد المسجد أو المصلى فقط، ولن تدخل تلقائيًا في الرصيد المتاح للمكتبة.' : ''}</div>"""
if old_total_message not in page:
    raise SystemExit('Missing movement total info block')
page = page.replace(old_total_message, new_total_message)

page = page.replace(
    'placeholder="مثال: إضافة رصيد للمكتبة، إضافة لمسجد، إرجاع فائض، سبب التسوية..."',
    'placeholder={quranStockMovementForm.movementType === \'site_withdrawal\' ? \'تفاصيل إضافية عن حالة المصاحف أو مكان حفظها بعد السحب...\' : \'مثال: إضافة رصيد للمكتبة، إضافة لمسجد، إرجاع فائض، سبب التسوية...\'}',
)

# Remove the misleading manual "withdrawn" entry from physical inventory. A withdrawal
# must now be an auditable movement, not a hand-edited physical-inventory attribute.
old_inventory_card = """<Card className=\"border-amber-200/70\"><CardHeader className=\"pb-3\"><CardTitle className=\"text-base\">الحالة والاحتياج</CardTitle></CardHeader><CardContent className=\"grid gap-4 md:grid-cols-3\"><Field label=\"المصاحف المسحوبة\"><Input type=\"number\" min=\"0\" step=\"1\" inputMode=\"numeric\" value={quranForm.damagedCount} onChange={(e) => setQuranForm({ ...quranForm, damagedCount: e.target.value })} /></Field><Field label=\"المطلوب توفيره\"><Input type=\"number\" min=\"0\" step=\"1\" inputMode=\"numeric\" value={quranForm.neededCount} onChange={(e) => setQuranForm({ ...quranForm, neededCount: e.target.value })} /></Field><Field label=\"تاريخ الجرد\"><Input type=\"date\" value={quranForm.countedAt} onChange={(e) => setQuranForm({ ...quranForm, countedAt: e.target.value })} /></Field></CardContent></Card>"""
new_inventory_card = """<Card className=\"border-amber-200/70\"><CardHeader className=\"pb-3\"><CardTitle className=\"text-base\">الاحتياج وتاريخ الجرد</CardTitle><CardDescription>المصاحف المسحوبة تسجل من إجراء «سحب مصاحف» حتى يتم خصمها من رصيد الموقع وحفظ سبب السحب.</CardDescription></CardHeader><CardContent className=\"grid gap-4 md:grid-cols-2\"><Field label=\"المطلوب توفيره\"><Input type=\"number\" min=\"0\" step=\"1\" inputMode=\"numeric\" value={quranForm.neededCount} onChange={(e) => setQuranForm({ ...quranForm, neededCount: e.target.value })} /></Field><Field label=\"تاريخ الجرد\"><Input type=\"date\" value={quranForm.countedAt} onChange={(e) => setQuranForm({ ...quranForm, countedAt: e.target.value })} /></Field></CardContent></Card>"""
if old_inventory_card not in page:
    raise SystemExit('Missing physical inventory state card')
page = page.replace(old_inventory_card, new_inventory_card)

# New physical inventories no longer accept a manual withdrawn count.
old_values = """    const values = ['largeCount', 'mediumCount', 'smallCount', 'damagedCount', 'neededCount'] as const;"""
new_values = """    const values = ['largeCount', 'mediumCount', 'smallCount', 'neededCount'] as const;"""
if old_values not in page:
    raise SystemExit('Missing physical inventory field list')
page = page.replace(old_values, new_values)
page = page.replace("    if (parsed.damagedCount > total) return toast.error('عدد المصاحف المسحوبة لا يمكن أن يتجاوز إجمالي المصاحف');\n", '')

old_payload = """        ...parsed,
        countedAt: quranForm.countedAt || new Date().toISOString(),"""
new_payload = """        ...parsed,
        damagedCount: 0,
        countedAt: quranForm.countedAt || new Date().toISOString(),"""
if old_payload not in page:
    raise SystemExit('Missing physical inventory payload')
page = page.replace(old_payload, new_payload, 1)

# Legacy physical inventory history remains visible, but distinguish the old field
# from the new auditable withdrawal ledger.
page = page.replace('<th className="p-3">المسحوبة</th><th className="p-3">الاحتياج</th><th className="p-3">مسجل الجرد</th>', '<th className="p-3">مسحوبة (جرد سابق)</th><th className="p-3">الاحتياج</th><th className="p-3">مسجل الجرد</th>')

if api == api_original or page == page_original:
    raise SystemExit('Expected frontend files were not both changed')

api_path.write_text(api, encoding='utf-8')
page_path.write_text(page, encoding='utf-8')
print('Quran site-withdrawal frontend workflow added')
