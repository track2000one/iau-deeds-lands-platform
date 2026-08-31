from pathlib import Path

path = Path('src/app/pages/MosquesUnitPage.tsx')
text = path.read_text(encoding='utf-8')

# 1) Terminology: the unit manages a Quran library, not a university warehouse.
replacements = {
"  receipt: 'توريد / استلام للمستودع',\n  distribution: 'صرف وتوزيع لمسجد / مصلى',\n  return: 'إرجاع من مسجد / مصلى',\n  warehouse_damage: 'استبعاد تالف من المستودع',": "  receipt: 'إضافة رصيد للمكتبة',\n  distribution: 'إضافة مصاحف لمسجد / مصلى',\n  return: 'إرجاع إلى مكتبة المصاحف',\n  warehouse_damage: 'استبعاد تالف من المكتبة',",
"    ? 'تراجع عن صرف'": "    ? 'تراجع عن إضافة مصاحف'",
"const emptyQuranWarehouseForm = () => ({ code: '', name: 'المستودع المركزي للمصاحف',": "const emptyQuranWarehouseForm = () => ({ code: '', name: 'مكتبة المصاحف',",
"if (!String(quranWarehouseForm.name || '').trim()) return toast.error('اسم المستودع إلزامي');": "if (!String(quranWarehouseForm.name || '').trim()) return toast.error('اسم المكتبة إلزامي');",
"toast.success('تم حفظ تعديلات مستودع المصاحف');": "toast.success('تم حفظ تعديلات مكتبة المصاحف');",
"toast.success('تم إنشاء مستودع المصاحف');": "toast.success('تم إنشاء مكتبة المصاحف');",
"editingQuranWarehouse ? 'تعذر تعديل مستودع المصاحف' : 'تعذر إنشاء مستودع المصاحف'": "editingQuranWarehouse ? 'تعذر تعديل مكتبة المصاحف' : 'تعذر إنشاء مكتبة المصاحف'",
"`هل تريد حذف المستودع «${warehouse.name}»؟\\n\\nلن يسمح النظام بالحذف إذا كان المستودع مرتبطًا بحركات مخزون محفوظة حفاظًا على السجل المحاسبي.`": "`هل تريد حذف المكتبة «${warehouse.name}»؟\\n\\nلن يسمح النظام بالحذف إذا كانت المكتبة مرتبطة بحركات محفوظة حفاظًا على السجل.`",
"toast.success('تم حذف مستودع المصاحف');": "toast.success('تم حذف مكتبة المصاحف');",
"'تعذر حذف مستودع المصاحف'": "'تعذر حذف مكتبة المصاحف'",
"'لا توجد حركات مخزون ظاهرة لهذا المستودع.'": "'لا توجد حركات مصاحف ظاهرة لهذه المكتبة.'",
"<title>بطاقة مستودع المصاحف -": "<title>بطاقة مكتبة المصاحف -",
"<h1>بطاقة مستودع المصاحف</h1>": "<h1>بطاقة مكتبة المصاحف</h1>",
"toast.error('لا يوجد مستودع مصاحف متاح للصرف');": "toast.error('لا توجد مكتبة مصاحف مفعّلة لإضافة المصاحف');",
"if (!quranStockMovementForm.warehouseId) return toast.error('اختر مستودع المصاحف');": "if (!quranStockMovementForm.warehouseId) return toast.error('اختر مكتبة المصاحف');",
"toast.success(quranStockMovementForm.movementType === 'distribution' ? 'تم صرف المصاحف وخصمها من رصيد المستودع' : quranStockMovementForm.movementType === 'receipt' ? 'تم إضافة التوريد إلى رصيد المستودع' : 'تم تسجيل حركة المخزون بنجاح');": "toast.success(quranStockMovementForm.movementType === 'distribution' ? 'تمت إضافة المصاحف للموقع وخصمها تلقائيًا من رصيد المكتبة' : quranStockMovementForm.movementType === 'receipt' ? 'تمت إضافة الكمية إلى رصيد مكتبة المصاحف' : 'تم تسجيل حركة المصاحف بنجاح');",
"if (isQuranDistributionReversed(movement.movementNumber)) return toast.info('تم التراجع عن حركة الصرف هذه مسبقًا');": "if (isQuranDistributionReversed(movement.movementNumber)) return toast.info('تم التراجع عن إضافة المصاحف هذه مسبقًا');",
"const reason = window.prompt(`سبب التراجع عن حركة الصرف ${movement.movementNumber}:`, 'إدخال حركة الصرف بالخطأ');": "const reason = window.prompt(`سبب التراجع عن إضافة المصاحف ${movement.movementNumber}:`, 'إضافة المصاحف للموقع بالخطأ');",
"if (!window.confirm(`سيتم عكس حركة الصرف ${movement.movementNumber} وإعادة ${movement.totalCount} مصحفًا إلى المستودع مع إبقاء الحركة الأصلية في السجل. هل تريد المتابعة؟`)) return;": "if (!window.confirm(`سيتم عكس إضافة المصاحف ${movement.movementNumber} وإعادة ${movement.totalCount} مصحفًا إلى المكتبة مع إبقاء الحركة الأصلية في السجل. هل تريد المتابعة؟`)) return;",
"toast.success(`تم التراجع عن الصرف وإعادة الكمية للمستودع بموجب ${result.reversal.movementNumber}`);": "toast.success(`تم التراجع عن الإضافة وإعادة الكمية للمكتبة بموجب ${result.reversal.movementNumber}`);",
"<CardTitle className=\"flex items-center gap-2 text-xl\"><span className=\"inline-flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-amber-300 to-emerald-500 text-white shadow-[0_0_20px_rgba(245,158,11,0.35)]\"><BookOpen className=\"h-5 w-5\" /></span>مستودع المصاحف والتوزيع</CardTitle>": "<CardTitle className=\"flex items-center gap-2 text-xl\"><span className=\"inline-flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-amber-300 to-emerald-500 text-white shadow-[0_0_20px_rgba(245,158,11,0.35)]\"><BookOpen className=\"h-5 w-5\" /></span>مكتبة المصاحف</CardTitle>",
"<CardDescription className=\"mt-2\">تسجيل المصاحف أولًا في المستودع المركزي، ثم صرفها للمساجد والمصليات مع الخصم التلقائي من الرصيد وحفظ سجل كل حركة.</CardDescription>": "<CardDescription className=\"mt-2\">رصيد داخلي لوحدة العناية بالمساجد والمصليات. عند إضافة مصاحف لأي مسجد أو مصلى تُخصم الكمية تلقائيًا من مكتبة المصاحف مع حفظ السجل.</CardDescription>",
"<Button variant=\"outline\" className={button3d} onClick={openQuranWarehouse}><Plus className=\"ml-1 h-4 w-4\" />إضافة مستودع</Button>\n                <Button className=\"bg-emerald-700 hover:bg-emerald-600\" onClick={() => openQuranStockMovement('receipt')} disabled={!quranStockDashboard?.warehouses.length}><Plus className=\"ml-1 h-4 w-4\" />توريد للمستودع</Button>\n                <Button className=\"bg-sky-700 hover:bg-sky-600\" onClick={() => openQuranStockMovement('distribution')} disabled={!quranStockDashboard?.warehouses.length}><ExternalLink className=\"ml-1 h-4 w-4\" />صرف وتوزيع</Button>\n                <Button variant=\"outline\" className=\"border-amber-300 text-amber-800\" onClick={() => openQuranStockMovement('return')} disabled={!quranStockDashboard?.warehouses.length}><RefreshCw className=\"ml-1 h-4 w-4\" />إرجاع للمستودع</Button>": "{!quranStockDashboard?.warehouses.length && <Button variant=\"outline\" className={button3d} onClick={openQuranWarehouse}><Plus className=\"ml-1 h-4 w-4\" />إنشاء مكتبة المصاحف</Button>}\n                <Button className=\"bg-emerald-700 hover:bg-emerald-600\" onClick={() => openQuranStockMovement('receipt')} disabled={!quranStockDashboard?.warehouses.length}><Plus className=\"ml-1 h-4 w-4\" />إضافة رصيد للمكتبة</Button>\n                <Button variant=\"outline\" className=\"border-amber-300 text-amber-800\" onClick={() => openQuranStockMovement('return')} disabled={!quranStockDashboard?.warehouses.length}><RefreshCw className=\"ml-1 h-4 w-4\" />إرجاع للمكتبة</Button>",
"<ReportMetric label=\"رصيد المستودعات\" value={quranStockDashboard?.summary.warehouseTotal || 0} />": "<ReportMetric label=\"رصيد المكتبة\" value={quranStockDashboard?.summary.warehouseTotal || 0} />",
"<ReportMetric label=\"الكبيرة بالمستودع\"": "<ReportMetric label=\"الكبيرة بالمكتبة\"",
"<ReportMetric label=\"المتوسطة بالمستودع\"": "<ReportMetric label=\"المتوسطة بالمكتبة\"",
"<ReportMetric label=\"الصغيرة بالمستودع\"": "<ReportMetric label=\"الصغيرة بالمكتبة\"",
"<ReportMetric label=\"إجمالي المورد\"": "<ReportMetric label=\"إجمالي المضاف للمكتبة\"",
"<ReportMetric label=\"إجمالي الموزع\"": "<ReportMetric label=\"إجمالي المضاف للمواقع\"",
"يوجد {quranStockDashboard?.summary.lowStockWarehouses} مستودع تحت الحد الأدنى": "يوجد رصيد في مكتبة المصاحف تحت الحد الأدنى",
"لم يتم إنشاء مستودع للمصاحف بعد": "لم يتم إنشاء مكتبة المصاحف بعد",
"ابدأ بإنشاء المستودع المركزي ثم سجل أول توريد قبل توزيع المصاحف على المواقع.": "ابدأ بإنشاء مكتبة المصاحف، ثم أضف رصيدها. بعد ذلك تتم إضافة المصاحف من داخل بطاقة المسجد أو المصلى مع الخصم التلقائي من المكتبة.",
"إنشاء المستودع المركزي": "إنشاء مكتبة المصاحف",
"لم يحدد موقع المستودع": "لم يحدد موقع المكتبة",
"التراجع عن الصرف ينشئ حركة إرجاع عكسية ويحافظ على الحركة الأصلية للتدقيق.": "التراجع عن إضافة المصاحف ينشئ حركة إرجاع عكسية ويحافظ على الحركة الأصلية للتدقيق.",
"<th className=\"p-3\">المستودع</th>": "<th className=\"p-3\">المكتبة</th>",
"الجرد الفعلي للموجود داخل المساجد والمصليات للمطابقة مع الرصيد النظامي وحركات الصرف من المستودع، مع متابعة التالف والاحتياج.": "الجرد الفعلي للموجود داخل المساجد والمصليات للمطابقة مع الرصيد النظامي والإضافات القادمة من مكتبة المصاحف، مع متابعة التالف والاحتياج.",
"/>صرف من المستودع</Button>": "/>إضافة من المكتبة</Button>",
"ملاحظة محاسبية: <strong>هذا الجدول يمثل آخر جرد فعلي للموقع.</strong> إضافة مصحف هنا لا تخصم من المستودع؛ الخصم يتم فقط عبر حركة «صرف وتوزيع». إجمالي الجرد = كبيرة + متوسطة + صغيرة، والتالف جزء من الإجمالي.": "ملاحظة: <strong>هذا الجدول يمثل آخر جرد فعلي للموقع.</strong> زيادة رصيد المسجد أو المصلى تتم من زر «إضافة من المكتبة» فقط، وعندها تخصم الكمية تلقائيًا من مكتبة المصاحف. الجرد مخصص للمطابقة الفعلية ولا يستخدم لإضافة رصيد جديد.",
"— هذا جرد فعلي للموجود بالموقع ولا يخصم من المستودع. لإضافة مصاحف من المكتبة استخدم «صرف من المستودع».": "— هذا جرد فعلي للموجود بالموقع. زيادة الرصيد تتم من «إضافة من المكتبة» ليتم الخصم تلقائيًا من رصيد مكتبة المصاحف.",
"<strong>تنبيه:</strong> الجرد الفعلي هو مطابقة لما هو موجود داخل المسجد أو المصلى، ولا ينشئ حركة صرف ولا يغيّر رصيد المستودع. إذا كانت المصاحف مستلمة من مكتبة المصاحف فسجّلها أولًا عبر «صرف من المستودع» ليتم الخصم تلقائيًا.": "<strong>تنبيه:</strong> الجرد الفعلي للمطابقة فقط. لا يمكن زيادة رصيد مسجد أو مصلى من شاشة الجرد بعد اعتماد أول جرد؛ استخدم «إضافة من المكتبة» ليتم خصم الكمية تلقائيًا من مكتبة المصاحف وحفظ الحركة.",
"value={quranSummary.total || 0}": "value={quranStockDashboard?.summary.siteSystemTotal ?? quranSummary.total ?? 0}",
}

for old, new in replacements.items():
    if old not in text:
        raise SystemExit(f'Missing expected frontend snippet: {old[:120]}')
    text = text.replace(old, new)

# 2) Use the current system stock when opening the physical-count dialog.
old = """  const openQuranInventoryDialog = (site: MosqueSite) => {\n    const latest = quranLatestBySite[site.id] as MosqueQuranInventory | null | undefined;\n    setQuranInventorySite(site);\n    setQuranForm({\n      siteId: site.id,\n      largeCount: String(latest?.largeCount ?? 0),\n      mediumCount: String(latest?.mediumCount ?? 0),\n      smallCount: String(latest?.smallCount ?? 0),\n"""
new = """  const openQuranInventoryDialog = (site: MosqueSite) => {\n    const latest = quranLatestBySite[site.id] as MosqueQuranInventory | null | undefined;\n    const systemStock = quranStockDashboard?.sites.find((item) => item.site.id === site.id)?.systemStock;\n    setQuranInventorySite(site);\n    setQuranForm({\n      siteId: site.id,\n      largeCount: String(systemStock?.largeCount ?? latest?.largeCount ?? 0),\n      mediumCount: String(systemStock?.mediumCount ?? latest?.mediumCount ?? 0),\n      smallCount: String(systemStock?.smallCount ?? latest?.smallCount ?? 0),\n"""
if old not in text:
    raise SystemExit('openQuranInventoryDialog block not found')
text = text.replace(old, new, 1)

# 3) Once a baseline count exists, physical inventory cannot be used to increase site stock.
old = """    const total = parsed.largeCount + parsed.mediumCount + parsed.smallCount;\n    if (parsed.damagedCount > total) return toast.error('عدد المصاحف التالفة لا يمكن أن يتجاوز إجمالي المصاحف');\n    setSaving(true);\n"""
new = """    const total = parsed.largeCount + parsed.mediumCount + parsed.smallCount;\n    if (parsed.damagedCount > total) return toast.error('عدد المصاحف التالفة لا يمكن أن يتجاوز إجمالي المصاحف');\n    const currentSystemStock = quranStockDashboard?.sites.find((item) => item.site.id === quranInventorySite.id)?.systemStock;\n    const hasPreviousInventory = Boolean(quranLatestBySite[quranInventorySite.id]);\n    if (hasPreviousInventory && currentSystemStock && (\n      parsed.largeCount > currentSystemStock.largeCount ||\n      parsed.mediumCount > currentSystemStock.mediumCount ||\n      parsed.smallCount > currentSystemStock.smallCount\n    )) return toast.error('زيادة رصيد المسجد أو المصلى تتم من «إضافة من المكتبة» ليتم الخصم تلقائيًا من مكتبة المصاحف');\n    setSaving(true);\n"""
if old not in text:
    raise SystemExit('saveQuranInventory validation anchor not found')
text = text.replace(old, new, 1)

# Remaining visible warehouse terms in the Quran library dialogs/printouts.
text = text.replace('تعديل مستودع المصاحف', 'تعديل مكتبة المصاحف')
text = text.replace('إنشاء مستودع المصاحف', 'إنشاء مكتبة المصاحف')
text = text.replace('بيانات المستودع وحدود الأمان وحالة التفعيل', 'بيانات المكتبة وحدود الأمان وحالة التفعيل')
text = text.replace('يمكن إنشاء مستودع مركزي الآن، مع إمكانية إضافة مستودعات أخرى مستقبلًا وربط كل حركة بالمستودع الصحيح.', 'مكتبة المصاحف هي الرصيد الداخلي للوحدة، وتُربط بها إضافات المصاحف للمساجد والمصليات تلقائيًا.')
text = text.replace('اسم المستودع *', 'اسم المكتبة *')
text = text.replace('مثال: المستودع المركزي للمصاحف', 'مثال: مكتبة المصاحف')
text = text.replace('رمز المستودع', 'رمز المكتبة')
text = text.replace('موقع المستودع', 'موقع المكتبة')
text = text.replace('حالة المستودع', 'حالة المكتبة')
text = text.replace('الحاجة إلى التوريد', 'الحاجة إلى إضافة رصيد للمكتبة')
text = text.replace('المستودع / المكتبة', 'المكتبة')
text = text.replace('المستودع', 'المكتبة')
text = text.replace('مستودع المصاحف', 'مكتبة المصاحف')
text = text.replace('حركات الصرف', 'حركات الإضافة')
text = text.replace('حركة الصرف', 'حركة الإضافة')
text = text.replace('الصرف والتوزيع', 'إضافة المصاحف للمواقع')
text = text.replace('الصرف', 'الإضافة')
text = text.replace('التوريد', 'إضافة الرصيد')

# Ensure the two old global action labels are gone.
for forbidden in ['>صرف وتوزيع</Button>', '>توريد للمستودع</Button>', '>صرف من المستودع</Button>']:
    if forbidden in text:
        raise SystemExit(f'Old Quran warehouse action still visible: {forbidden}')

path.write_text(text, encoding='utf-8')
print('Simplified Quran workflow to library terminology and enforced library-backed site additions.')
