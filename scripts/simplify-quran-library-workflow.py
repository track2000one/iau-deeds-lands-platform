from pathlib import Path

path = Path('src/app/pages/MosquesUnitPage.tsx')
text = path.read_text(encoding='utf-8')


def rep(old: str, new: str, *, required: bool = False) -> None:
    global text
    if old in text:
        text = text.replace(old, new)
    elif required:
        raise SystemExit(f'Missing required frontend snippet: {old[:140]}')


# User-facing terminology: this is an internal Quran library for the unit, not a university warehouse.
rep("  receipt: 'توريد / استلام للمستودع',\n  distribution: 'صرف وتوزيع لمسجد / مصلى',\n  return: 'إرجاع من مسجد / مصلى',\n  warehouse_damage: 'استبعاد تالف من المستودع',",
    "  receipt: 'إضافة رصيد للمكتبة',\n  distribution: 'إضافة مصاحف لمسجد / مصلى',\n  return: 'إرجاع إلى مكتبة المصاحف',\n  warehouse_damage: 'استبعاد تالف من المكتبة',", required=True)
rep("    ? 'تراجع عن صرف'", "    ? 'تراجع عن إضافة مصاحف'", required=True)
rep("const emptyQuranWarehouseForm = () => ({ code: '', name: 'المستودع المركزي للمصاحف',", "const emptyQuranWarehouseForm = () => ({ code: '', name: 'مكتبة المصاحف',", required=True)

# Library management messages.
for old, new in [
    ("اسم المستودع إلزامي", "اسم المكتبة إلزامي"),
    ("تم حفظ تعديلات مستودع المصاحف", "تم حفظ تعديلات مكتبة المصاحف"),
    ("تم إنشاء مستودع المصاحف", "تم إنشاء مكتبة المصاحف"),
    ("تعذر تعديل مستودع المصاحف", "تعذر تعديل مكتبة المصاحف"),
    ("تعذر إنشاء مستودع المصاحف", "تعذر إنشاء مكتبة المصاحف"),
    ("تم حذف مستودع المصاحف", "تم حذف مكتبة المصاحف"),
    ("تعذر حذف مستودع المصاحف", "تعذر حذف مكتبة المصاحف"),
    ("لا يوجد مستودع مصاحف متاح للصرف", "لا توجد مكتبة مصاحف مفعّلة لإضافة المصاحف"),
    ("اختر مستودع المصاحف", "اختر مكتبة المصاحف"),
    ("بطاقة مستودع المصاحف", "بطاقة مكتبة المصاحف"),
    ("لم يحدد موقع المستودع", "لم يحدد موقع المكتبة"),
    ("اسم المستودع *", "اسم المكتبة *"),
    ("مثال: المستودع المركزي للمصاحف", "مثال: مكتبة المصاحف"),
    ("رمز المستودع", "رمز المكتبة"),
    ("موقع المستودع", "موقع المكتبة"),
    ("حالة المستودع", "حالة المكتبة"),
]:
    rep(old, new)

rep("`هل تريد حذف المستودع «${warehouse.name}»?", "`هل تريد حذف المكتبة «${warehouse.name}»?")
rep("لن يسمح النظام بالحذف إذا كان المستودع مرتبطًا بحركات مخزون محفوظة حفاظًا على السجل المحاسبي.", "لن يسمح النظام بالحذف إذا كانت المكتبة مرتبطة بحركات محفوظة حفاظًا على السجل.")

# Success/reversal messages; keep the INTERNAL legacy note prefix 'تراجع عن حركة الصرف' untouched for old records.
rep("toast.success(quranStockMovementForm.movementType === 'distribution' ? 'تم صرف المصاحف وخصمها من رصيد المستودع' : quranStockMovementForm.movementType === 'receipt' ? 'تم إضافة التوريد إلى رصيد المستودع' : 'تم تسجيل حركة المخزون بنجاح');",
    "toast.success(quranStockMovementForm.movementType === 'distribution' ? 'تمت إضافة المصاحف للموقع وخصمها تلقائيًا من رصيد المكتبة' : quranStockMovementForm.movementType === 'receipt' ? 'تمت إضافة الكمية إلى رصيد مكتبة المصاحف' : 'تم تسجيل حركة المصاحف بنجاح');", required=True)
rep("تم التراجع عن حركة الصرف هذه مسبقًا", "تم التراجع عن إضافة المصاحف هذه مسبقًا")
rep("سبب التراجع عن حركة الصرف ${movement.movementNumber}:", "سبب التراجع عن إضافة المصاحف ${movement.movementNumber}:")
rep("إدخال حركة الصرف بالخطأ", "إضافة المصاحف للموقع بالخطأ")
rep("سيتم عكس حركة الصرف ${movement.movementNumber} وإعادة ${movement.totalCount} مصحفًا إلى المستودع مع إبقاء الحركة الأصلية في السجل.", "سيتم عكس إضافة المصاحف ${movement.movementNumber} وإعادة ${movement.totalCount} مصحفًا إلى المكتبة مع إبقاء الحركة الأصلية في السجل.")
rep("تم التراجع عن الصرف وإعادة الكمية للمستودع بموجب ${result.reversal.movementNumber}", "تم التراجع عن الإضافة وإعادة الكمية للمكتبة بموجب ${result.reversal.movementNumber}")

# Main Quran library card.
rep("مستودع المصاحف والتوزيع", "مكتبة المصاحف", required=True)
rep("تسجيل المصاحف أولًا في المستودع المركزي، ثم صرفها للمساجد والمصليات مع الخصم التلقائي من الرصيد وحفظ سجل كل حركة.",
    "رصيد داخلي لوحدة العناية بالمساجد والمصليات. عند إضافة مصاحف لأي مسجد أو مصلى تُخصم الكمية تلقائيًا من مكتبة المصاحف مع حفظ سجل الحركة.", required=True)

old_buttons = """                <Button variant=\"outline\" className={button3d} onClick={openQuranWarehouse}><Plus className=\"ml-1 h-4 w-4\" />إضافة مستودع</Button>
                <Button className=\"bg-emerald-700 hover:bg-emerald-600\" onClick={() => openQuranStockMovement('receipt')} disabled={!quranStockDashboard?.warehouses.length}><Plus className=\"ml-1 h-4 w-4\" />توريد للمستودع</Button>
                <Button className=\"bg-sky-700 hover:bg-sky-600\" onClick={() => openQuranStockMovement('distribution')} disabled={!quranStockDashboard?.warehouses.length}><ExternalLink className=\"ml-1 h-4 w-4\" />صرف وتوزيع</Button>
                <Button variant=\"outline\" className=\"border-amber-300 text-amber-800\" onClick={() => openQuranStockMovement('return')} disabled={!quranStockDashboard?.warehouses.length}><RefreshCw className=\"ml-1 h-4 w-4\" />إرجاع للمستودع</Button>"""
new_buttons = """                {!quranStockDashboard?.warehouses.length && <Button variant=\"outline\" className={button3d} onClick={openQuranWarehouse}><Plus className=\"ml-1 h-4 w-4\" />إنشاء مكتبة المصاحف</Button>}
                <Button className=\"bg-emerald-700 hover:bg-emerald-600\" onClick={() => openQuranStockMovement('receipt')} disabled={!quranStockDashboard?.warehouses.length}><Plus className=\"ml-1 h-4 w-4\" />إضافة رصيد للمكتبة</Button>
                <Button variant=\"outline\" className=\"border-amber-300 text-amber-800\" onClick={() => openQuranStockMovement('return')} disabled={!quranStockDashboard?.warehouses.length}><RefreshCw className=\"ml-1 h-4 w-4\" />إرجاع للمكتبة</Button>"""
rep(old_buttons, new_buttons, required=True)

# Metrics and empty state.
for old, new in [
    ('رصيد المستودعات', 'رصيد المكتبة'),
    ('الكبيرة بالمستودع', 'الكبيرة بالمكتبة'),
    ('المتوسطة بالمستودع', 'المتوسطة بالمكتبة'),
    ('الصغيرة بالمستودع', 'الصغيرة بالمكتبة'),
    ('إجمالي المورد', 'إجمالي المضاف للمكتبة'),
    ('إجمالي الموزع', 'إجمالي المضاف للمواقع'),
    ('لم يتم إنشاء مستودع للمصاحف بعد', 'لم يتم إنشاء مكتبة المصاحف بعد'),
    ('ابدأ بإنشاء المستودع المركزي ثم سجل أول توريد قبل توزيع المصاحف على المواقع.', 'ابدأ بإنشاء مكتبة المصاحف ثم أضف رصيدها. بعد ذلك تتم إضافة المصاحف من داخل بطاقة المسجد أو المصلى مع الخصم التلقائي من المكتبة.'),
    ('إنشاء المستودع المركزي', 'إنشاء مكتبة المصاحف'),
    ('<th className="p-3">المستودع</th>', '<th className="p-3">المكتبة</th>'),
]:
    rep(old, new)
rep("يوجد {quranStockDashboard?.summary.lowStockWarehouses} مستودع تحت الحد الأدنى،", "رصيد مكتبة المصاحف تحت الحد الأدنى،")

# Site workflow: addition happens from the site itself, not from a global distribution button.
rep('/>صرف من المستودع</Button>', '/>إضافة من المكتبة</Button>', required=True)
rep('الجرد الفعلي للموجود داخل المساجد والمصليات للمطابقة مع الرصيد النظامي وحركات الصرف من المستودع، مع متابعة التالف والاحتياج.',
    'الجرد الفعلي للموجود داخل المساجد والمصليات للمطابقة مع الرصيد النظامي والإضافات القادمة من مكتبة المصاحف، مع متابعة التالف والاحتياج.', required=True)
rep('ملاحظة محاسبية: <strong>هذا الجدول يمثل آخر جرد فعلي للموقع.</strong> إضافة مصحف هنا لا تخصم من المستودع؛ الخصم يتم فقط عبر حركة «صرف وتوزيع». إجمالي الجرد = كبيرة + متوسطة + صغيرة، والتالف جزء من الإجمالي.',
    'ملاحظة: <strong>هذا الجدول يمثل آخر جرد فعلي للموقع.</strong> زيادة رصيد المسجد أو المصلى تتم من زر «إضافة من المكتبة» فقط، وعندها تخصم الكمية تلقائيًا من مكتبة المصاحف. الجرد مخصص للمطابقة الفعلية ولا يستخدم لإضافة رصيد جديد.', required=True)
rep('— هذا جرد فعلي للموجود بالموقع ولا يخصم من المستودع. لإضافة مصاحف من المكتبة استخدم «صرف من المستودع».',
    '— هذا جرد فعلي للموجود بالموقع. زيادة الرصيد تتم من «إضافة من المكتبة» ليتم الخصم تلقائيًا من رصيد مكتبة المصاحف.')
rep('<strong>تنبيه:</strong> الجرد الفعلي هو مطابقة لما هو موجود داخل المسجد أو المصلى، ولا ينشئ حركة صرف ولا يغيّر رصيد المستودع. إذا كانت المصاحف مستلمة من مكتبة المصاحف فسجّلها أولًا عبر «صرف من المستودع» ليتم الخصم تلقائيًا.',
    '<strong>تنبيه:</strong> الجرد الفعلي للمطابقة فقط. لا يمكن زيادة رصيد مسجد أو مصلى من شاشة الجرد بعد اعتماد أول جرد؛ استخدم «إضافة من المكتبة» ليتم خصم الكمية تلقائيًا من مكتبة المصاحف وحفظ الحركة.')

# Open physical count with the current system stock so library-backed additions appear immediately.
old_open = """  const openQuranInventoryDialog = (site: MosqueSite) => {
    const latest = quranLatestBySite[site.id] as MosqueQuranInventory | null | undefined;
    setQuranInventorySite(site);
    setQuranForm({
      siteId: site.id,
      largeCount: String(latest?.largeCount ?? 0),
      mediumCount: String(latest?.mediumCount ?? 0),
      smallCount: String(latest?.smallCount ?? 0),"""
new_open = """  const openQuranInventoryDialog = (site: MosqueSite) => {
    const latest = quranLatestBySite[site.id] as MosqueQuranInventory | null | undefined;
    const systemStock = quranStockDashboard?.sites.find((item) => item.site.id === site.id)?.systemStock;
    setQuranInventorySite(site);
    setQuranForm({
      siteId: site.id,
      largeCount: String(systemStock?.largeCount ?? latest?.largeCount ?? 0),
      mediumCount: String(systemStock?.mediumCount ?? latest?.mediumCount ?? 0),
      smallCount: String(systemStock?.smallCount ?? latest?.smallCount ?? 0),"""
rep(old_open, new_open, required=True)

# Physical count may reconcile downwards, but after a baseline it cannot increase stock and bypass the library.
old_validation = """    const total = parsed.largeCount + parsed.mediumCount + parsed.smallCount;
    if (parsed.damagedCount > total) return toast.error('عدد المصاحف التالفة لا يمكن أن يتجاوز إجمالي المصاحف');
    setSaving(true);"""
new_validation = """    const total = parsed.largeCount + parsed.mediumCount + parsed.smallCount;
    if (parsed.damagedCount > total) return toast.error('عدد المصاحف التالفة لا يمكن أن يتجاوز إجمالي المصاحف');
    const currentSystemStock = quranStockDashboard?.sites.find((item) => item.site.id === quranInventorySite.id)?.systemStock;
    const hasPreviousInventory = Boolean(quranLatestBySite[quranInventorySite.id]);
    if (hasPreviousInventory && currentSystemStock && (
      parsed.largeCount > currentSystemStock.largeCount ||
      parsed.mediumCount > currentSystemStock.mediumCount ||
      parsed.smallCount > currentSystemStock.smallCount
    )) return toast.error('زيادة رصيد المسجد أو المصلى تتم من «إضافة من المكتبة» ليتم الخصم تلقائيًا من مكتبة المصاحف');
    setSaving(true);"""
rep(old_validation, new_validation, required=True)

# Dashboard totals should reflect the movement-backed system stock, not only the last physical snapshot.
rep('value={quranSummary.total || 0}', 'value={quranStockDashboard?.summary.siteSystemTotal ?? quranSummary.total ?? 0}')

# Keep legacy reversal-note recognition for previously saved rows.
if "movement.notes?.startsWith('تراجع عن حركة الصرف')" not in text:
    raise SystemExit('Legacy reversal note recognition was unexpectedly changed')

for forbidden in ['>صرف وتوزيع</Button>', '>توريد للمستودع</Button>', '>صرف من المستودع</Button>']:
    if forbidden in text:
        raise SystemExit(f'Old Quran action is still visible: {forbidden}')

path.write_text(text, encoding='utf-8')
print('Simplified Quran workflow to an internal library and enforced library-backed site additions.')
