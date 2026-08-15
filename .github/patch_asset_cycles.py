from pathlib import Path

p = Path('src/app/pages/AssetCyclesPage.tsx')
s = p.read_text()

pairs = [
    (
        '''      <Card className="overflow-hidden rounded-[32px] border text-[color:var(--asset-dashboard-text,#fff)]" style={{ background: 'var(--asset-dashboard-overlay, linear-gradient(135deg,#23364a 0%,#122941 44%,#0a1f36 100%))', borderColor: 'var(--asset-dashboard-border,rgba(255,255,255,.20))', boxShadow: '0 26px 75px color-mix(in srgb, var(--asset-dashboard-base,#10243b) 32%, transparent)' }}>
        <CardContent className="p-6 sm:p-8">''',
        '''      <Card className="overflow-hidden rounded-[32px] border border-slate-200/90 bg-white/95 text-slate-900 shadow-[0_20px_55px_rgba(15,23,42,.10)]">
        <CardContent className="p-6 sm:p-8">'''
    ),
    (
        '<Badge className="border-[color:var(--asset-dashboard-inner-border,rgba(255,255,255,.12))] bg-[var(--asset-dashboard-soft,rgba(255,255,255,.10))] text-[color:var(--asset-dashboard-text,#fff)]"><History className="ml-1 h-3.5 w-3.5" />سجل تاريخي كامل</Badge>',
        '<Badge className="border-sky-200 bg-sky-50 text-sky-800"><History className="ml-1 h-3.5 w-3.5" />سجل تاريخي كامل</Badge>'
    ),
    (
        '<Badge className="border-emerald-300/30 bg-emerald-300/15 text-[color:var(--asset-dashboard-text,#fff)]"><ShieldCheck className="ml-1 h-3.5 w-3.5 text-emerald-300" />لا حذف للبيانات القديمة</Badge>',
        '<Badge className="border-emerald-200 bg-emerald-50 text-emerald-800"><ShieldCheck className="ml-1 h-3.5 w-3.5" />لا حذف للبيانات القديمة</Badge>'
    ),
    (
        '<h1 className="text-3xl font-black sm:text-4xl">دورات تحديث بيانات الأصول</h1>',
        '<h1 className="text-3xl font-black text-[#123d73] sm:text-4xl">دورات تحديث بيانات الأصول</h1>'
    ),
    (
        '<p className="mt-2 max-w-3xl text-sm leading-7 text-[color:var(--asset-dashboard-muted,#cbd5e1)]">كل تحديث يحفظ كإصدار مستقل. الدورة الجديدة تمر بالاستيراد والمقارنة والمراجعة قبل أن تصبح هي البيانات الحالية، وتبقى الإصدارات السابقة مؤرشفة وقابلة للعرض والتقرير.</p>',
        '<p className="mt-2 max-w-3xl text-sm leading-7 text-slate-600">كل تحديث يحفظ كإصدار مستقل. الدورة الجديدة تمر بالاستيراد والمقارنة والمراجعة قبل أن تصبح هي البيانات الحالية، وتبقى الإصدارات السابقة مؤرشفة وقابلة للعرض والتقرير.</p>'
    ),
    (
        '<Button className="border-0 text-white shadow-lg hover:brightness-110" style={{ background: \'var(--asset-dashboard-button,#123d73)\' }}',
        '<Button className="border-0 bg-[#123d73] text-white shadow-md hover:bg-[#164b87]"'
    ),
    (
        '<Button variant="outline" className="border-[color:var(--asset-dashboard-inner-border,rgba(255,255,255,.12))] bg-[var(--asset-dashboard-soft,rgba(255,255,255,.10))] text-[color:var(--asset-dashboard-text,#fff)] hover:bg-[var(--asset-dashboard-soft,rgba(255,255,255,.10))] hover:text-[color:var(--asset-dashboard-text,#fff)]"',
        '<Button variant="outline" className="border-slate-300 bg-white text-[#123d73] hover:bg-slate-50 hover:text-[#123d73]"'
    ),
    (
        '{currentCycle && <div className="mt-6 rounded-2xl border p-4" style={{ background: \'var(--asset-dashboard-panel-strong,rgba(255,255,255,.105))\', borderColor: \'var(--asset-dashboard-inner-border,rgba(255,255,255,.12))\' }}><div className="text-xs font-bold text-[color:var(--asset-dashboard-muted,#cbd5e1)]">الدورة الحالية المعتمدة</div><div className="mt-1 text-lg font-black">#{currentCycle.cycleNumber} — {currentCycle.name}</div><div className="mt-2 text-xs text-[color:var(--asset-dashboard-muted,#cbd5e1)]">',
        '{currentCycle && <div className="mt-6 rounded-2xl border border-sky-100 bg-sky-50/65 p-4"><div className="text-xs font-bold text-slate-500">الدورة الحالية المعتمدة</div><div className="mt-1 text-lg font-black text-slate-900">#{currentCycle.cycleNumber} — {currentCycle.name}</div><div className="mt-2 text-xs text-slate-500">'
    ),
]

for old, new in pairs:
    if old not in s:
        raise SystemExit('pattern missing: ' + old[:120])
    s = s.replace(old, new, 1)

p.write_text(s)
