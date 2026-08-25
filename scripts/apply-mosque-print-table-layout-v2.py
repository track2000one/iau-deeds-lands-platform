from pathlib import Path

path = Path('src/app/pages/MosquesUnitPage.tsx')
text = path.read_text(encoding='utf-8')

replacements = {
    "    @page { size: A4 landscape; margin: 4mm 5mm 5mm; }": "    @page { size: A4 landscape; margin: 1mm 2mm 2mm; }",
    "    body { font-size: 8.2px; line-height: 1.35; }": "    body { font-size: 7.6px; line-height: 1.22; }",
    "    .header { margin: 0 0 2.5mm; padding: 0 0 2.2mm; border-bottom: 1.5px solid #0f6f99; }": "    .header { margin: 0 0 1.3mm; padding: 0 0 1.2mm; border-bottom: 1.2px solid #0f6f99; }",
    "    .kicker { color: #587083; font-size: 7.5px; margin-bottom: 0.8mm; }": "    .kicker { color: #587083; font-size: 6.4px; margin-bottom: 0.35mm; }",
    "    h1 { margin: 0; color: #102a43; font-size: 16px; line-height: 1.15; }": "    h1 { margin: 0; color: #102a43; font-size: 13.5px; line-height: 1.05; }",
    "    .meta { margin-top: 1mm; color: #66788a; font-size: 7.3px; display: flex; justify-content: space-between; gap: 3mm; }": "    .meta { margin-top: 0.45mm; color: #66788a; font-size: 6.4px; display: flex; justify-content: space-between; gap: 2mm; }",
    "    .filters { margin-top: 1.4mm; padding: 1.2mm 1.8mm; border: 1px solid #dbe7ef; border-radius: 1.5mm; background: #f8fbfd; color: #50677a; font-size: 7.3px; line-height: 1.35; }": "    .filters { margin-top: 0.7mm; padding: 0.75mm 1.1mm; border: 1px solid #dbe7ef; border-radius: 1mm; background: #f8fbfd; color: #50677a; font-size: 6.4px; line-height: 1.2; }",
    "    th, td { border: 1px solid #cdd9e3; padding: 1.45mm 1.05mm; vertical-align: middle; text-align: right; line-height: 1.32; word-break: normal; overflow-wrap: anywhere; }": "    th, td { border: 1px solid #cdd9e3; padding: 0.85mm 0.6mm; vertical-align: middle; text-align: right; line-height: 1.18; word-break: normal; overflow-wrap: anywhere; }",
    "    th { background: #eaf5fb; color: #173a50; font-weight: 900; font-size: 7.4px; white-space: nowrap; }": "    th { background: #eaf5fb; color: #173a50; font-weight: 900; font-size: 6.7px; white-space: nowrap; }",
    "    .footer { margin-top: 2mm; padding-top: 1.5mm; border-top: 1px solid #dce5ec; display: flex; justify-content: space-between; gap: 3mm; color: #718496; font-size: 6.5px; }": "    .footer { margin-top: 1mm; padding-top: 0.8mm; border-top: 1px solid #dce5ec; display: flex; justify-content: space-between; gap: 2mm; color: #718496; font-size: 5.8px; }",
}

for old, new in replacements.items():
    if old not in text:
        raise SystemExit(f'Missing expected source fragment: {old}')
    text = text.replace(old, new, 1)

path.write_text(text, encoding='utf-8')
