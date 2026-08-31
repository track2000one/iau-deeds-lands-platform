from pathlib import Path

path = Path('src/app/pages/MosquesUnitPage.tsx')
text = path.read_text(encoding='utf-8')
original = text

replacements = {
    "className={`${button3d} bg-violet-700 hover:bg-violet-600`}": "className={`${button3d} border border-slate-300 bg-slate-100 text-slate-800 hover:bg-slate-200 hover:text-slate-900`}",
    "className={`${button3d} bg-sky-700 hover:bg-sky-600`}": "className={`${button3d} border border-emerald-700 bg-emerald-700 text-white hover:bg-emerald-600`}",
    "className={`${button3d} bg-amber-600 hover:bg-amber-500`}": "className={`${button3d} border border-amber-300 bg-amber-50 text-amber-800 hover:bg-amber-100 hover:text-amber-900`}",
}

for old, new in replacements.items():
    if old not in text:
        raise SystemExit(f'Missing expected class: {old}')
    text = text.replace(old, new, 1)

if text == original:
    raise SystemExit('No changes applied')

path.write_text(text, encoding='utf-8')
print('Quran action colors refined')
