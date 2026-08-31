from pathlib import Path

path = Path('src/app/pages/MosquesUnitPage.tsx')
text = path.read_text(encoding='utf-8')

old_button = '''<Button
  size="sm"
  onClick={() => openQuranInventoryDialog(site)}
  className="group relative overflow-hidden border-0 bg-gradient-to-l from-emerald-700 via-emerald-600 to-teal-500 font-black text-white shadow-[0_0_14px_rgba(16,185,129,0.42),0_4px_0_rgba(6,95,70,0.24)] transition-all duration-300 hover:-translate-y-0.5 hover:from-emerald-600 hover:to-teal-400 hover:shadow-[0_0_24px_rgba(16,185,129,0.68),0_4px_0_rgba(6,95,70,0.22)]"
>
  <span className="pointer-events-none absolute inset-0 animate-pulse bg-gradient-to-r from-transparent via-white/15 to-transparent" />
  <span className="relative ml-1 inline-flex h-6 w-6 items-center justify-center rounded-lg bg-amber-300 text-emerald-950 shadow-[0_0_14px_rgba(253,224,71,0.92)] ring-1 ring-white/80">
    <BookOpen className="h-3.5 w-3.5" />
  </span>
  <span className="relative">تسجيل جرد فعلي</span>
</Button>'''

if old_button not in text:
    raise SystemExit('Physical inventory action button not found')
text = text.replace(old_button, '', 1)

old_action = '''{role === 'head' && <Button size="sm" className={`${button3d} bg-sky-700 hover:bg-sky-600`} onClick={() => openQuranDistributionForSite(site)}><ExternalLink className="ml-1 h-3.5 w-3.5" />إضافة من المكتبة</Button>}'''
new_action = '''{role === 'head' && <Button size="sm" className={`${button3d} bg-sky-700 hover:bg-sky-600`} onClick={() => openQuranDistributionForSite(site)}><BookOpen className="ml-1 h-3.5 w-3.5" />إضافة مصحف من المكتبة</Button>}'''
if old_action not in text:
    raise SystemExit('Library add action button not found')
text = text.replace(old_action, new_action, 1)

text = text.replace(
    'الجرد الفعلي للموجود داخل المساجد والمصليات للمطابقة مع الرصيد النظامي والإضافات القادمة من مكتبة المصاحف، مع متابعة التالف والاحتياج.',
    'متابعة رصيد المصاحف في المساجد والمصليات. تتم إضافة المصاحف من مكتبة المصاحف مباشرة مع الخصم التلقائي من رصيد المكتبة.',
    1,
)
text = text.replace(
    'ملاحظة: <strong>هذا الجدول يمثل آخر جرد فعلي للموقع.</strong> زيادة رصيد المسجد أو المصلى تتم من زر «إضافة من المكتبة» فقط، وعندها تخصم الكمية تلقائيًا من مكتبة المصاحف. الجرد مخصص للمطابقة الفعلية ولا يستخدم لإضافة رصيد جديد.',
    'ملاحظة: <strong>إضافة المصاحف للمسجد أو المصلى تتم من زر «إضافة مصحف من المكتبة» فقط.</strong> عند الإضافة تخصم الكمية تلقائيًا من رصيد مكتبة المصاحف وتضاف إلى رصيد الموقع مع حفظ الحركة.',
    1,
)

if 'تسجيل جرد فعلي</span>' in text:
    raise SystemExit('Physical inventory action is still visible')
if 'إضافة مصحف من المكتبة</Button>' not in text:
    raise SystemExit('Renamed library action is missing')

path.write_text(text, encoding='utf-8')
print('Removed physical inventory action and renamed library add button.')
