from pathlib import Path

path = Path('src/app/pages/MosquesUnitPage.tsx')
text = path.read_text(encoding='utf-8')

replacements = {
    "    @page { size: A4 landscape; margin: 9mm; }": "    @page { size: A4 landscape; margin: 4mm 5mm 5mm; }",
    "    body { font-size: 9px; }": "    body { font-size: 8.2px; line-height: 1.35; }",
    "    .header { margin-bottom: 5mm; padding-bottom: 4mm; border-bottom: 2px solid #0f6f99; }": "    .header { margin: 0 0 2.5mm; padding: 0 0 2.2mm; border-bottom: 1.5px solid #0f6f99; }",
    "    .kicker { color: #587083; font-size: 9px; margin-bottom: 1.5mm; }": "    .kicker { color: #587083; font-size: 7.5px; margin-bottom: 0.8mm; }",
    "    h1 { margin: 0; color: #102a43; font-size: 19px; }": "    h1 { margin: 0; color: #102a43; font-size: 16px; line-height: 1.15; }",
    "    .meta { margin-top: 2mm; color: #66788a; font-size: 8px; display: flex; justify-content: space-between; gap: 5mm; }": "    .meta { margin-top: 1mm; color: #66788a; font-size: 7.3px; display: flex; justify-content: space-between; gap: 3mm; }",
    "    .filters { margin-top: 2.5mm; padding: 2mm 2.5mm; border: 1px solid #dbe7ef; border-radius: 2mm; background: #f8fbfd; color: #50677a; font-size: 8px; line-height: 1.6; }": "    .filters { margin-top: 1.4mm; padding: 1.2mm 1.8mm; border: 1px solid #dbe7ef; border-radius: 1.5mm; background: #f8fbfd; color: #50677a; font-size: 7.3px; line-height: 1.35; }",
    "    th, td { border: 1px solid #cdd9e3; padding: 2.2mm 1.6mm; vertical-align: middle; text-align: right; line-height: 1.55; word-break: break-word; }": "    th, td { border: 1px solid #cdd9e3; padding: 1.45mm 1.05mm; vertical-align: middle; text-align: right; line-height: 1.32; word-break: normal; overflow-wrap: anywhere; }",
    "    th { background: #eaf5fb; color: #173a50; font-weight: 900; font-size: 8px; }": "    th { background: #eaf5fb; color: #173a50; font-weight: 900; font-size: 7.4px; white-space: nowrap; }",
    "    td:first-child, th:first-child { width: 4%; text-align: center; }": "    td:first-child, th:first-child { width: 3.5%; text-align: center; }",
    "    th:nth-child(2) { width: 14%; }": "    th:nth-child(2) { width: 10.5%; }",
    "    th:nth-child(3) { width: 7%; }": "    th:nth-child(3) { width: 6%; }",
    "    th:nth-child(4) { width: 7%; }": "    th:nth-child(4) { width: 6%; }",
    "    th:nth-child(5) { width: 17%; }": "    th:nth-child(5) { width: 20%; }",
    "    th:nth-child(6) { width: 13%; }": "    th:nth-child(6) { width: 16%; }",
    "    th:nth-child(7) { width: 8%; }": "    th:nth-child(7) { width: 7%; }",
    "    th:nth-child(8), th:nth-child(9) { width: 11%; }": "    th:nth-child(8), th:nth-child(9) { width: 11.5%; }",
    "    th:nth-child(10) { width: 8%; }": "    th:nth-child(10) { width: 8%; }",
    "    td.name { font-weight: 800; color: #183b56; }": "    td.name { font-weight: 800; color: #183b56; }\n    td:nth-child(1), td:nth-child(3), td:nth-child(4), td:nth-child(7), td:nth-child(10) { text-align: center; }",
    "    .footer { margin-top: 4mm; padding-top: 2.5mm; border-top: 1px solid #dce5ec; display: flex; justify-content: space-between; gap: 4mm; color: #718496; font-size: 7px; }": "    .footer { margin-top: 2mm; padding-top: 1.5mm; border-top: 1px solid #dce5ec; display: flex; justify-content: space-between; gap: 3mm; color: #718496; font-size: 6.5px; }",
}

for old, new in replacements.items():
    if old not in text:
        raise SystemExit(f'Missing expected print-table fragment: {old}')
    text = text.replace(old, new, 1)

path.write_text(text, encoding='utf-8')
print('Mosque print table layout updated successfully.')
