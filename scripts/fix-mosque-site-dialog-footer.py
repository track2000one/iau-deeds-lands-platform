from pathlib import Path

path = Path('src/app/pages/MosquesUnitPage.tsx')
text = path.read_text(encoding='utf-8')

old_dialog = '<DialogContent className="max-h-[94vh] overflow-hidden p-0 gap-0 border-sky-200/80 bg-gradient-to-br from-white via-sky-50/40 to-violet-50/30 sm:max-w-[1180px]" dir="rtl">'
new_dialog = '<DialogContent className="grid h-[94dvh] max-h-[94dvh] grid-rows-[auto_minmax(0,1fr)_auto] overflow-hidden p-0 gap-0 border-sky-200/80 bg-gradient-to-br from-white via-sky-50/40 to-violet-50/30 sm:max-w-[1180px]" dir="rtl">'
if text.count(old_dialog) != 1:
    raise SystemExit(f'site dialog container: expected 1 match, found {text.count(old_dialog)}')
text = text.replace(old_dialog, new_dialog, 1)

old_scroll = '<div className="max-h-[calc(94vh-150px)] space-y-5 overflow-y-auto p-4 md:p-6">'
new_scroll = '<div className="min-h-0 space-y-5 overflow-y-auto overscroll-contain p-4 pb-6 md:p-6">'
if text.count(old_scroll) != 1:
    raise SystemExit(f'site dialog scroll area: expected 1 match, found {text.count(old_scroll)}')
text = text.replace(old_scroll, new_scroll, 1)

old_footer = '<DialogFooter className="border-t border-sky-100 bg-white/95 p-4 md:px-6"><Button variant="outline" className={button3d} onClick={() => setSiteDialog(false)}>إلغاء</Button><Button className={\'min-w-32 \' + button3d} onClick={saveSite} disabled={saving}><Save className="ml-2 h-4 w-4" />{saving ? \'جاري الحفظ...\' : editingSite ? \'حفظ التعديلات\' : \'إضافة الموقع\'}</Button></DialogFooter>'
new_footer = '<DialogFooter className="relative z-20 shrink-0 border-t border-sky-100 bg-white p-4 shadow-[0_-12px_30px_rgba(15,23,42,0.10)] md:px-6"><Button variant="outline" className={button3d} onClick={() => setSiteDialog(false)}>إلغاء</Button><Button className={\'min-w-32 \' + button3d} onClick={saveSite} disabled={saving}><Save className="ml-2 h-4 w-4" />{saving ? \'جاري الحفظ...\' : editingSite ? \'حفظ التعديلات\' : \'إضافة الموقع\'}</Button></DialogFooter>'
if text.count(old_footer) != 1:
    raise SystemExit(f'site dialog footer: expected 1 match, found {text.count(old_footer)}')
text = text.replace(old_footer, new_footer, 1)

for marker in [
    'grid-rows-[auto_minmax(0,1fr)_auto]',
    'min-h-0 space-y-5 overflow-y-auto overscroll-contain',
    'shadow-[0_-12px_30px_rgba(15,23,42,0.10)]',
]:
    if marker not in text:
        raise SystemExit(f'missing marker after patch: {marker}')

path.write_text(text, encoding='utf-8')
print('Mosque site dialog footer visibility patch applied.')
