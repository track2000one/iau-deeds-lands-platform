from pathlib import Path

panel_path = Path('src/app/components/MosqueFieldVisitsPanel.tsx')
panel = panel_path.read_text(encoding='utf-8')

replacements = [
    (
        '<div className="flex flex-col items-end gap-1.5"><StatusBadge status={visit.workflowStatus} />{quranVisitNeedsCorrection(visit) && <Badge className="bg-amber-600 text-white"><AlertTriangle className="ml-1 h-3 w-3" />جرد المصاحف يحتاج تصحيح</Badge>}</div>',
        '<div className="flex flex-col items-end gap-1.5"><StatusBadge status={visit.workflowStatus} />{visit.canEdit !== true && <Badge variant="outline" className="border-slate-300 bg-slate-100 text-slate-700"><Eye className="ml-1 h-3 w-3" />عرض فقط</Badge>}{quranVisitNeedsCorrection(visit) && <Badge className="bg-amber-600 text-white"><AlertTriangle className="ml-1 h-3 w-3" />جرد المصاحف يحتاج تصحيح</Badge>}</div>',
        'visit read-only badge',
    ),
    (
        '{canPrint && <Button size="sm" variant="outline" onClick={() => requestVisitPrint(visit)}><Printer className="ml-1 h-4 w-4" />تقرير</Button>}',
        '{canPrint && visit.canEdit === true && <Button size="sm" variant="outline" onClick={() => requestVisitPrint(visit)}><Printer className="ml-1 h-4 w-4" />تقرير</Button>}',
        'visit report ownership gate',
    ),
    (
        '{visit.canDelete === true && <Button size="sm" variant="destructive"',
        '{canDelete && visit.canDelete === true && <Button size="sm" variant="destructive"',
        'visit delete permission gate',
    ),
    (
        '}{canPrint && <div className="grid gap-2 sm:grid-cols-2"><Button size="sm" className="w-full border border-emerald-700 bg-emerald-600 text-white hover:bg-emerald-700 hover:text-white" onClick={() => exportTourTreatmentExcel(tour)}>',
        '}{canPrint && tour.canEdit === true && <div className="grid gap-2 sm:grid-cols-2"><Button size="sm" className="w-full border border-emerald-700 bg-emerald-600 text-white hover:bg-emerald-700 hover:text-white" onClick={() => exportTourTreatmentExcel(tour)}>',
        'tour report ownership gate',
    ),
    (
        '}{tour.canDelete === true && <Button size="sm" variant="destructive"',
        '}{canDelete && tour.canDelete === true && <Button size="sm" variant="destructive"',
        'tour delete permission gate',
    ),
    (
        '}{tour.canDelete !== true && tour.canCancel === true && tour.status !== \'cancelled\' && <Button size="sm" variant="destructive"',
        '}{canEdit && tour.canDelete !== true && tour.canCancel === true && tour.status !== \'cancelled\' && <Button size="sm" variant="destructive"',
        'tour cancel permission gate',
    ),
]

for old, new, label in replacements:
    if old not in panel:
        raise SystemExit(f'{label} target not found')
    panel = panel.replace(old, new, 1)

panel_path.write_text(panel, encoding='utf-8')

permissions_path = Path('src/app/components/PermissionMatrix.tsx')
permissions = permissions_path.read_text(encoding='utf-8')
old = """            <p className=\"mt-2 text-xs font-medium text-primary\">\n              {ui('يمكن تمرير الجدول بعجلة الفأرة أو بسحب شريط التمرير الواضح على طرف الجدول، كما يمكن استخدام زري أعلى وأسفل للانتقال السريع.', 'Scroll with the mouse wheel or drag the visible scrollbar at the edge of the table. You can also use the Top and Bottom buttons for quick navigation.')}\n            </p>\n"""
new = """            <p className=\"mt-1 text-xs font-semibold text-emerald-700\">\n              {ui('سياسة الجولات والزيارات الميدانية: صلاحيتا «تعديل» و«حذف» في وحدة المساجد تسمحان للمستخدم بإدارة الجولات والزيارات التي أنشأها بنفسه فقط. سجلات المستخدمين الآخرين تكون «عرض فقط»، بينما مسؤول النظام أو رئيس الوحدة يستطيع إدارة جميع السجلات وفق الصلاحيات الممنوحة.', 'Field tours and visits policy: Edit and Delete permissions in the Mosques module let a user manage only tours and visits they created. Other users’ records are read-only, while the system administrator or unit head can manage all records according to granted permissions.')}\n            </p>\n            <p className=\"mt-2 text-xs font-medium text-primary\">\n              {ui('يمكن تمرير الجدول بعجلة الفأرة أو بسحب شريط التمرير الواضح على طرف الجدول، كما يمكن استخدام زري أعلى وأسفل للانتقال السريع.', 'Scroll with the mouse wheel or drag the visible scrollbar at the edge of the table. You can also use the Top and Bottom buttons for quick navigation.')}\n            </p>\n"""
if old not in permissions:
    raise SystemExit('permission-matrix policy insertion target not found')
permissions = permissions.replace(old, new, 1)
permissions_path.write_text(permissions, encoding='utf-8')

print('Applied mosque owner-only visit/tour UI permissions and admin guidance')
