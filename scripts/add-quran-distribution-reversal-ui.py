from pathlib import Path

page_path = Path('src/app/pages/MosquesUnitPage.tsx')
page = page_path.read_text(encoding='utf-8')

bad = """const quranStockMovementDisplayLabel = (movement: MosqueQuranStockMovement) =>
  movement.movementType === 'return' && movement.notes?.startsWith('تراجع عن حركة الصرف')
    ? 'تراجع عن صرف'
    : quranStockMovementDisplayLabel(movement);
"""
good = """const quranStockMovementDisplayLabel = (movement: MosqueQuranStockMovement) =>
  movement.movementType === 'return' && movement.notes?.startsWith('تراجع عن حركة الصرف')
    ? 'تراجع عن صرف'
    : quranStockMovementTypeLabels[movement.movementType] || movement.movementType;
"""

if bad in page:
    page = page.replace(bad, good, 1)
elif good not in page:
    raise SystemExit('Quran movement display helper not found in expected form')

if ": quranStockMovementDisplayLabel(movement);" in page:
    raise SystemExit('Recursive Quran movement label helper still present')

page_path.write_text(page, encoding='utf-8')
print('Repaired Quran movement label helper and verified no recursive self-call remains.')
