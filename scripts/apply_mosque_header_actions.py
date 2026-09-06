from pathlib import Path

path = Path('src/app/pages/MosquesUnitPage.tsx')
text = path.read_text(encoding='utf-8')

anchor = '''<Button variant="outline" className={button3d} onClick={() => navigate('/mosques/public')}><ExternalLink className="ml-2 h-4 w-4" />البوابة العامة</Button>'''
anchor_pos = text.find(anchor)
if anchor_pos < 0:
    raise SystemExit('Public portal button anchor was not found.')

start_marker = '<div className="flex flex-wrap gap-2">'
start = text.rfind(start_marker, 0, anchor_pos)
if start < 0:
    raise SystemExit('Header action container was not found.')

add_anchor = '''{canAdd && ['head', 'supervisor'].includes(role) && <Button className={`${button3d} bg-sky-700 hover:bg-sky-800`} onClick={() => openSiteDialog()}><Plus className="ml-2 h-4 w-4" />إضافة مسجد / مصلى</Button>}'''
add_pos = text.find(add_anchor, anchor_pos)
if add_pos < 0:
    raise SystemExit('Add mosque button anchor was not found.')

end = text.find('</div>', add_pos + len(add_anchor))
if end < 0:
    raise SystemExit('Header action container end was not found.')
end += len('</div>')

indent = text[text.rfind('\n', 0, start) + 1:start]
new = '''{indent}<div className="grid w-full gap-3 sm:grid-cols-2 lg:w-[580px] lg:shrink-0">
{indent}  {{canAdd && ['head', 'supervisor'].includes(role) && <Button className={{`${{button3d}} min-h-12 w-full border border-emerald-700 bg-emerald-600 px-5 text-base font-black text-white shadow-[0_5px_0_rgba(4,120,87,0.22),0_10px_20px_rgba(5,150,105,0.16)] hover:border-emerald-800 hover:bg-emerald-700 hover:text-white focus-visible:ring-emerald-500 sm:col-span-2`}} onClick={{() => openSiteDialog()}}><Plus className="ml-2 h-5 w-5 text-white" />إضافة مسجد / مصلى</Button>}}
{indent}  {{['head', 'supervisor'].includes(role) && <Button variant="outline" className={{`${{button3d}} min-h-11 w-full justify-center border-slate-300 bg-white font-bold text-slate-800 hover:border-sky-300 hover:bg-sky-50`}} onClick={{() => goToDashboardSection('field-visits')}}><ClipboardList className="ml-2 h-4 w-4 text-sky-700" />الجولات والزيارات</Button>}}
{indent}  <Button variant="outline" className={{`${{button3d}} min-h-11 w-full justify-center border-slate-300 bg-white font-bold text-slate-800 hover:border-sky-300 hover:bg-sky-50`}} onClick={{() => navigate('/mosques/public')}}><ExternalLink className="ml-2 h-4 w-4 text-sky-700" />البوابة العامة</Button>
{indent}  <Button variant="outline" className={{`${{button3d}} min-h-11 w-full justify-center border-slate-300 bg-white font-bold text-slate-800 hover:border-slate-400 hover:bg-slate-50`}} onClick={{loadAll}}><RefreshCw className="ml-2 h-4 w-4 text-slate-600" />تحديث</Button>
{indent}  {{canEdit && ['head', 'supervisor'].includes(role) && <Button variant="outline" className={{`${{button3d}} min-h-11 w-full justify-center border-slate-300 bg-white font-bold text-slate-800 hover:border-slate-400 hover:bg-slate-50`}} onClick={{openMediaImportDialog}}><FileText className="ml-2 h-4 w-4 text-slate-600" />استيراد مكتبة ZIP</Button>}}
{indent}</div>'''.format(indent=indent)

text = text[:start] + new + text[end:]
path.write_text(text, encoding='utf-8')
print('Updated mosque unit hero action layout.')
