from pathlib import Path
import re

path = Path('src/app/pages/MosquesUnitPage.tsx')
text = path.read_text(encoding='utf-8')

# Remove every visible button that opens the old physical-inventory dialog.
# The dialog/data model can remain internally for backward compatibility, but the UI workflow
# must now rely on library-backed additions only.
button_pattern = re.compile(
    r'<Button\b(?:(?!</Button>).)*?onClick=\{\(\) => openQuranInventoryDialog\(site\)\}(?:(?!</Button>).)*?</Button>',
    re.S,
)
text, removed_buttons = button_pattern.subn('', text)
if removed_buttons < 1:
    raise SystemExit('No physical inventory action button was found')

# Rename the site action everywhere it is rendered.
text, renamed_actions = re.subn(
    r'<ExternalLink className="ml-1 h-3\.5 w-3\.5" />إضافة من المكتبة</Button>',
    '<BookOpen className="ml-1 h-3.5 w-3.5" />إضافة مصحف من المكتبة</Button>',
    text,
)
if renamed_actions < 1:
    # Allow reruns after the label is already applied.
    if 'إضافة مصحف من المكتبة</Button>' not in text:
        raise SystemExit('Library add action button was not found')

# Make the explanatory copy match the simplified workflow.
text = text.replace(
    'الجرد الفعلي للموجود داخل المساجد والمصليات للمطابقة مع الرصيد النظامي والإضافات القادمة من مكتبة المصاحف، مع متابعة التالف والاحتياج.',
    'متابعة رصيد المصاحف في المساجد والمصليات. تتم إضافة المصاحف من مكتبة المصاحف مباشرة مع الخصم التلقائي من رصيد المكتبة.',
)
text = text.replace(
    'ملاحظة: <strong>هذا الجدول يمثل آخر جرد فعلي للموقع.</strong> زيادة رصيد المسجد أو المصلى تتم من زر «إضافة من المكتبة» فقط، وعندها تخصم الكمية تلقائيًا من مكتبة المصاحف. الجرد مخصص للمطابقة الفعلية ولا يستخدم لإضافة رصيد جديد.',
    'ملاحظة: <strong>إضافة المصاحف للمسجد أو المصلى تتم من زر «إضافة مصحف من المكتبة» فقط.</strong> عند الإضافة تخصم الكمية تلقائيًا من رصيد مكتبة المصاحف وتضاف إلى رصيد الموقع مع حفظ الحركة.',
)

# No user-facing trigger for the physical inventory workflow may remain.
if 'onClick={() => openQuranInventoryDialog(site)}' in text:
    raise SystemExit('A physical inventory action trigger is still visible')
if 'إضافة مصحف من المكتبة</Button>' not in text:
    raise SystemExit('Renamed library action is missing')

path.write_text(text, encoding='utf-8')
print(f'Removed {removed_buttons} physical inventory action button(s) and renamed {renamed_actions} library action(s).')
