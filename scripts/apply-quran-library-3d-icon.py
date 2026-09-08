from pathlib import Path

page = Path('src/app/pages/MosquesUnitPage.tsx')
text = page.read_text(encoding='utf-8')

import_anchor = "import JSZip from 'jszip';\n"
icon_import = "import quranLibrary3dIcon from '../../assets/quran-library-3d.svg';\n"
if icon_import not in text:
    if import_anchor not in text:
        raise SystemExit('Unable to find JSZip import anchor')
    text = text.replace(import_anchor, import_anchor + icon_import, 1)

old_header = '<CardTitle className="flex items-center gap-2 text-xl"><span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-amber-300 to-emerald-500 text-white shadow-[0_0_20px_rgba(245,158,11,0.35)]"><BookOpen className="h-5 w-5" /></span>مكتبة المصاحف</CardTitle>'
new_header = '''<CardTitle className="flex items-center gap-3 text-xl">
                  <span className="group relative inline-flex h-12 w-12 shrink-0 items-center justify-center">
                    <span className="absolute -inset-1 rounded-[18px] bg-gradient-to-br from-amber-300/55 via-emerald-400/40 to-cyan-300/30 blur-md transition duration-300 group-hover:blur-lg" />
                    <span className="absolute inset-0 rounded-2xl bg-white/45 shadow-[0_10px_24px_rgba(15,118,110,0.24),0_0_18px_rgba(245,158,11,0.2)]" />
                    <img src={quranLibrary3dIcon} alt="" aria-hidden="true" className="relative h-11 w-11 rounded-2xl object-cover shadow-[0_7px_14px_rgba(15,23,42,0.25),0_0_20px_rgba(245,158,11,0.24)] ring-1 ring-amber-200/90 transition duration-300 group-hover:-translate-y-0.5 group-hover:scale-105" />
                  </span>
                  مكتبة المصاحف
                </CardTitle>'''
if old_header not in text:
    raise SystemExit('Unable to find Quran library main header icon')
text = text.replace(old_header, new_header, 1)

old_empty = '<BookOpen className="mx-auto h-10 w-10 text-amber-600" />'
new_empty = '''<span className="relative mx-auto flex h-16 w-16 items-center justify-center">
                  <span className="absolute -inset-1 rounded-[22px] bg-gradient-to-br from-amber-300/45 via-emerald-400/35 to-cyan-300/25 blur-md" />
                  <img src={quranLibrary3dIcon} alt="" aria-hidden="true" className="relative h-14 w-14 rounded-[20px] object-cover shadow-[0_8px_18px_rgba(15,23,42,0.24),0_0_18px_rgba(245,158,11,0.22)] ring-1 ring-amber-200/80" />
                </span>'''
if old_empty in text:
    text = text.replace(old_empty, new_empty, 1)

old_dialog_icon = '<BookOpen className="h-5 w-5 text-emerald-700" />{editingQuranWarehouse ?'
new_dialog_icon = '<img src={quranLibrary3dIcon} alt="" aria-hidden="true" className="h-8 w-8 rounded-xl object-cover shadow-[0_4px_10px_rgba(15,23,42,0.22),0_0_12px_rgba(245,158,11,0.2)] ring-1 ring-amber-200/80" />{editingQuranWarehouse ?'
if old_dialog_icon in text:
    text = text.replace(old_dialog_icon, new_dialog_icon, 1)

page.write_text(text, encoding='utf-8')
print('Applied premium Quran library 3D icon to main header, empty state, and library dialog.')
