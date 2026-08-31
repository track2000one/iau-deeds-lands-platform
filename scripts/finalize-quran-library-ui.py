from pathlib import Path

path = Path('src/app/pages/MosquesUnitPage.tsx')
text = path.read_text(encoding='utf-8')


def replace(old: str, new: str, *, required: bool = False) -> None:
    global text
    if old in text:
        text = text.replace(old, new)
    elif required:
        raise SystemExit(f'Missing required snippet: {old[:160]}')

# Finish the visible terminology migration from warehouse/distribution to the unit's Quran library.
for old, new in [
    ('هل تريد حذف المستودع', 'هل تريد حذف المكتبة'),
    ('لا توجد حركات مخزون ظاهرة لهذا المستودع.', 'لا توجد حركات مصاحف ظاهرة لهذه المكتبة.'),
    ('معاينة مستودع المصاحف', 'معاينة مكتبة المصاحف'),
    ('اسم المستودع', 'اسم المكتبة'),
    ('آخر حركات هذا المستودع', 'آخر حركات هذه المكتبة'),
    ('تعديل مستودع المصاحف', 'تعديل مكتبة المصاحف'),
    ('إنشاء مستودع المصاحف', 'إنشاء مكتبة المصاحف'),
    ('تعديل بيانات المستودع وحدود الأمان وحالة التفعيل دون المساس بسجل حركات المخزون.', 'تعديل بيانات المكتبة وحدود الأمان وحالة التفعيل دون المساس بسجل حركات المصاحف.'),
    ('يمكن إنشاء مستودع مركزي الآن، مع إمكانية إضافة مستودعات أخرى مستقبلًا وربط كل حركة بالمستودع الصحيح.', 'مكتبة المصاحف هي الرصيد الداخلي للوحدة، وتُربط بها إضافات المصاحف للمساجد والمصليات تلقائيًا.'),
    ('الحاجة إلى التوريد', 'الحاجة إلى إضافة رصيد للمكتبة'),
    ('إنشاء المستودع', 'إنشاء المكتبة'),
    ('حركة مخزون المصاحف', 'حركة مصاحف المكتبة'),
    ('التوريد يزيد الرصيد، والصرف يخصم من المستودع ويضيف للموقع، والإرجاع يعيد الكمية من الموقع للمستودع. لا يتم تعديل الرصيد يدويًا خارج سجل الحركات.', 'إضافة الرصيد تزيد رصيد المكتبة، وإضافة المصاحف للموقع تخصمها تلقائيًا من المكتبة، والإرجاع يعيد الكمية إلى المكتبة. لا يتم تعديل الرصيد يدويًا خارج سجل الحركات.'),
    ('المستودع *', 'المكتبة *'),
    ('اختر المستودع', 'اختر المكتبة'),
    ('الرصيد الحالي للمستودع المحدد', 'الرصيد الحالي للمكتبة'),
    ('رقم المرجع / سند التوريد', 'رقم المرجع / السند'),
    ('سيتم خصمها تلقائيًا من المستودع وإضافتها إلى الرصيد النظامي للموقع.', 'سيتم خصمها تلقائيًا من مكتبة المصاحف وإضافتها إلى رصيد الموقع.'),
    ('مثال: توريد جديد، صرف لمسجد، إرجاع فائض، سبب التسوية...', 'مثال: إضافة رصيد للمكتبة، إضافة لمسجد، إرجاع فائض، سبب التسوية...'),
    ('صرف مصاحف من المستودع', 'إضافة من المكتبة'),
    ('تعذر التراجع عن حركة الصرف', 'تعذر التراجع عن إضافة المصاحف'),
    ('سجل حركات المخزون', 'سجل حركات المصاحف'),
    ('آخر حركات المخزون الظاهرة', 'آخر حركات المصاحف الظاهرة'),
]:
    replace(old, new)

# The Quran inventory table should immediately show movement-backed current stock after adding from the library.
old = """                    const site = sites.find((row) => row.id === item.site.id) || item.site as MosqueSite;
                    const latest = item.latest;
                    return <tr key={item.site.id} className=\"border-t border-slate-100 hover:bg-slate-50/60\"><td className=\"p-3\"><p className=\"font-black text-slate-800\">{item.site.name}</p><p className=\"mt-1 text-xs text-muted-foreground\">{siteTypeDisplayLabel(item.site as MosqueSite)} — {item.site.campusLocation || item.site.city || '-'}</p></td><td className=\"p-3 text-center font-bold\">{latest?.largeCount ?? 0}</td><td className=\"p-3 text-center font-bold\">{latest?.mediumCount ?? 0}</td><td className=\"p-3 text-center font-bold\">{latest?.smallCount ?? 0}</td><td className=\"p-3 text-center text-lg font-black text-emerald-700\">{latest?.totalCount ?? 0}</td>"""
new = """                    const site = sites.find((row) => row.id === item.site.id) || item.site as MosqueSite;
                    const latest = item.latest;
                    const systemStock = quranStockDashboard?.sites.find((row) => row.site.id === item.site.id)?.systemStock;
                    return <tr key={item.site.id} className=\"border-t border-slate-100 hover:bg-slate-50/60\"><td className=\"p-3\"><p className=\"font-black text-slate-800\">{item.site.name}</p><p className=\"mt-1 text-xs text-muted-foreground\">{siteTypeDisplayLabel(item.site as MosqueSite)} — {item.site.campusLocation || item.site.city || '-'}</p></td><td className=\"p-3 text-center font-bold\">{systemStock?.largeCount ?? latest?.largeCount ?? 0}</td><td className=\"p-3 text-center font-bold\">{systemStock?.mediumCount ?? latest?.mediumCount ?? 0}</td><td className=\"p-3 text-center font-bold\">{systemStock?.smallCount ?? latest?.smallCount ?? 0}</td><td className=\"p-3 text-center text-lg font-black text-emerald-700\">{systemStock?.totalCount ?? latest?.totalCount ?? 0}</td>"""
replace(old, new, required=True)

# Keep the legacy persisted reversal-note prefix for compatibility with existing rows.
if "movement.notes?.startsWith('تراجع عن حركة الصرف')" not in text:
    raise SystemExit('Legacy reversal-note compatibility was lost')

# The old global/site actions must no longer be visible.
for forbidden in ['توريد للمستودع', '>صرف وتوزيع</Button>', 'صرف مصاحف من المستودع']:
    if forbidden in text:
        raise SystemExit(f'Old Quran UI action still visible: {forbidden}')

path.write_text(text, encoding='utf-8')
print('Finalized Quran library terminology and current-stock display.')
