from pathlib import Path

path = Path('src/app/pages/MosquesUnitPage.tsx')
text = path.read_text(encoding='utf-8')

old = '''            <Card className="overflow-hidden border-sky-200/70 bg-white/90 shadow-[0_14px_36px_rgba(15,23,42,0.07)]">
              <CardHeader className="border-b border-sky-100 bg-gradient-to-l from-sky-50/95 via-white to-emerald-50/50 pb-4"><CardTitle className="flex items-center gap-2 text-base md:text-lg"><Users className="h-5 w-5" />المسؤولون الرئيسيون</CardTitle><CardDescription>هذه بيانات تعريفية مختصرة للموقع. بيانات الاتصال والصفة التشغيلية التفصيلية تُدار من تبويب «المنسوبون».</CardDescription></CardHeader>
              <CardContent className="grid grid-cols-1 gap-4 pt-5 md:grid-cols-3">
                <Field label="الإمام"><Input className="h-11" value={siteForm.imamName} onChange={(e) => setSiteForm({ ...siteForm, imamName: e.target.value })} /></Field>
                <Field label="المؤذن"><Input className="h-11" value={siteForm.muezzinName} onChange={(e) => setSiteForm({ ...siteForm, muezzinName: e.target.value })} /></Field>
                <Field label="الخطيب"><Input className="h-11" value={siteForm.khateebName} onChange={(e) => setSiteForm({ ...siteForm, khateebName: e.target.value })} /></Field>
              </CardContent>'''

new = '''            <Card className="overflow-hidden border-sky-200/70 bg-white/90 shadow-[0_14px_36px_rgba(15,23,42,0.07)]">
              <CardHeader className="border-b border-sky-100 bg-gradient-to-l from-sky-50/95 via-white to-emerald-50/50 pb-4"><CardTitle className="flex items-center gap-2 text-base md:text-lg"><Users className="h-5 w-5" />المسؤولون الرئيسيون</CardTitle><CardDescription>الأسماء مرتبطة تلقائيًا بسجل «منسوبي المساجد» حسب المسجد/المصلى والصفة التشغيلية؛ لا يتم إدخالها يدويًا من بطاقة الموقع.</CardDescription></CardHeader>
              <CardContent className="grid grid-cols-1 gap-4 pt-5 md:grid-cols-3">
                <Field label="الإمام — مرتبط تلقائيًا"><Input className="h-11 bg-slate-50 font-semibold" readOnly value={siteForm.imamName || 'غير مسجل في المنسوبين'} /></Field>
                <Field label="المؤذن — مرتبط تلقائيًا"><Input className="h-11 bg-slate-50 font-semibold" readOnly value={siteForm.muezzinName || 'غير مسجل في المنسوبين'} /></Field>
                <Field label="الخطيب — مرتبط تلقائيًا"><Input className="h-11 bg-slate-50 font-semibold" readOnly value={siteForm.khateebName || 'غير مسجل في المنسوبين'} /></Field>
                <div className="md:col-span-3 rounded-2xl border border-sky-200 bg-sky-50/70 px-4 py-3 text-sm leading-6 text-sky-900">لتغيير الإمام أو المؤذن أو الخطيب، عدّل سجل الشخص من تبويب <strong>«منسوبو المساجد»</strong> وحدد المسجد/المصلى والصفة الصحيحة. ستتحدث بطاقة الموقع والمعاينة والطباعة تلقائيًا.</div>
              </CardContent>'''

if old not in text:
    raise SystemExit('main personnel card block not found')
text = text.replace(old, new, 1)

payload_anchor = '''        ...siteForm,
        prayerRoomGender: siteForm.siteType === 'prayer_room' ? siteForm.prayerRoomGender : null,'''
if payload_anchor not in text:
    raise SystemExit('site payload anchor not found')
text = text.replace(payload_anchor, '''        ...siteForm,
        // أسماء المسؤولين مصدرها سجل المنسوبين، لذلك لا نحفظ نسخة يدوية قد تصبح قديمة.
        imamName: null,
        muezzinName: null,
        khateebName: null,
        prayerRoomGender: siteForm.siteType === 'prayer_room' ? siteForm.prayerRoomGender : null,''', 1)

path.write_text(text, encoding='utf-8')
print('Mosque personnel-link UI applied.')
