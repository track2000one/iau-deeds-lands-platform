from pathlib import Path

path = Path('src/app/pages/MosquesUnitPage.tsx')
text = path.read_text(encoding='utf-8')
original = text

replacements = {
    "warehouse_damage: 'استبعاد تالف من المكتبة'": "warehouse_damage: 'سحب مصاحف من المكتبة'",
    "عدد المصاحف التالفة لا يمكن أن يتجاوز إجمالي المصاحف": "عدد المصاحف المسحوبة لا يمكن أن يتجاوز إجمالي المصاحف",
    "damaged: 'لديه تالف'": "damaged: 'لديه مصاحف مسحوبة'",
    "damaged: 'التالفة'": "damaged: 'المسحوبة'",
    "المصاحف التالفة لا تضاف إلى إجمالي الأحجام": "المصاحف المسحوبة لا تضاف إلى إجمالي الأحجام",
    "['المصاحف التالفة',": "['المصاحف المسحوبة',",
    " تالف: item.latest?.damagedCount": " المسحوبة: item.latest?.damagedCount",
    "label=\"التالفة\"": "label=\"المسحوبة\"",
    ">تالفة<": ">المسحوبة<",
    ">التالفة<": ">المسحوبة<",
    "لديه مصاحف تالفة": "لديه مصاحف مسحوبة",
    "label=\"المصاحف التالفة\"": "label=\"المصاحف المسحوبة\"",
    "استبعاد مصاحف تالفة، حاجة إلى توفير مصاحف إضافية": "مصاحف مسحوبة، حاجة إلى توفير مصاحف إضافية",
}

applied = 0
for old, new in replacements.items():
    if old in text:
        text = text.replace(old, new)
        applied += 1

if text == original:
    raise SystemExit('No terminology changes were applied')

path.write_text(text, encoding='utf-8')
print(f'Updated Quran terminology mappings: {applied}')
