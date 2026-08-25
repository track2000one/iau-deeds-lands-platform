from pathlib import Path

path = Path('src/app/pages/MosquesUnitPage.tsx')
text = path.read_text(encoding='utf-8')
old = "    @page { size: A4 landscape; margin: 1mm 2mm 2mm; }"
new = "    @page { size: A4 landscape; margin: 5mm; }"
if old not in text:
    raise SystemExit(f'Missing expected source fragment: {old}')
text = text.replace(old, new, 1)
path.write_text(text, encoding='utf-8')
