from pathlib import Path

api_path = Path('src/app/api/mosques.ts')
api = api_path.read_text(encoding='utf-8')
needle = "  hasStarted?: boolean;\n  canDelete?: boolean;"
if api.count(needle) < 2:
    raise SystemExit(f'expected visit/tour access type blocks, found {api.count(needle)}')
api = api.replace(needle, "  hasStarted?: boolean;\n  canEdit?: boolean;\n  canDelete?: boolean;")
api_path.write_text(api, encoding='utf-8')

path = Path('src/app/components/MosqueFieldVisitsPanel.tsx')
text = path.read_text(encoding='utf-8')

replacements = [
    (
        "{canEdit && <Button size=\"sm\" onClick={() => openVisit(visit)}><Pencil className=\"ml-1 h-4 w-4\" />تعديل</Button>}",
        "{canEdit && visit.canEdit === true && <Button size=\"sm\" onClick={() => openVisit(visit)}><Pencil className=\"ml-1 h-4 w-4\" />تعديل</Button>}"
    ),
    (
        "{canEdit && <Button onClick={() => { const visit = viewingVisit; setViewingVisit(null); openVisit(visit); }}><Pencil className=\"ml-2 h-4 w-4\" />تعديل الزيارة</Button>}",
        "{canEdit && viewingVisit.canEdit === true && <Button onClick={() => { const visit = viewingVisit; setViewingVisit(null); openVisit(visit); }}><Pencil className=\"ml-2 h-4 w-4\" />تعديل الزيارة</Button>}"
    ),
    (
        "{canEdit && <NativeSelect value={tour.status} onChange={(event) => void updateTourStatus(tour, event.target.value as MosqueFieldTour['status'])}>",
        "{canEdit && tour.canEdit === true && <NativeSelect value={tour.status} onChange={(event) => void updateTourStatus(tour, event.target.value as MosqueFieldTour['status'])}>"
    ),
    (
        "onClick={() => { const full = visits.find((item) => item.id === visit.id); if (full) openVisit(full); }}",
        "onClick={() => { const full = visits.find((item) => item.id === visit.id); if (full) { if (canEdit && full.canEdit === true) openVisit(full); else setViewingVisit(full); } }}"
    ),
    (
        "الحذف متاح لمنشئ الجولة قبل بدء التنفيذ، أو لمسؤول المنصة عند الضرورة.",
        "الحذف متاح لمنشئ الجولة التي أنشأها بنفسه، أو لمسؤول المنصة الذي يملك الصلاحية الكاملة."
    ),
]

for old, new in replacements:
    if old not in text:
        raise SystemExit(f'UI pattern not found: {old[:100]}')
    text = text.replace(old, new, 1)

# Add a clear read-only marker for tours created by other users.
old = "<Badge variant=\"outline\">{tourStatusLabels[tour.status]}</Badge>"
new = "<div className=\"flex flex-wrap items-center gap-2\"><Badge variant=\"outline\">{tourStatusLabels[tour.status]}</Badge>{tour.canEdit !== true && <Badge variant=\"outline\" className=\"border-slate-300 bg-slate-100 text-slate-700\"><Eye className=\"ml-1 h-3 w-3\" />عرض فقط</Badge>}</div>"
if old not in text:
    raise SystemExit('tour status badge pattern not found')
text = text.replace(old, new, 1)

path.write_text(text, encoding='utf-8')
print('Applied owner/admin-only edit controls to tours and their visits')
