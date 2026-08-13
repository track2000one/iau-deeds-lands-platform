from pathlib import Path

path = Path('src/app/pages/MosquesUnitPage.tsx')
s = path.read_text(encoding='utf-8')

replacements = [
    (
        "{(role === 'personnel' || ['head', 'supervisor'].includes(role)) && <div className=\"flex justify-end\"><Button className={button3d} onClick={openRequestDialog}><Plus className=\"ml-2 h-4 w-4\" />طلب صيانة / احتياج جديد</Button></div>}",
        "{role === 'personnel' && <div className=\"flex justify-end\"><Button className={button3d} onClick={openRequestDialog}><Plus className=\"ml-2 h-4 w-4\" />الإبلاغ عن مشكلة / طلب صيانة أو احتياج</Button></div>}",
    ),
    (
        "{(role === 'personnel' || ['head', 'supervisor'].includes(role)) && <div className=\"flex justify-end\"><Button className={button3d} onClick={openLeaveDialog}><Plus className=\"ml-2 h-4 w-4\" />طلب إجازة / اعتذار</Button></div>}",
        "{role === 'personnel' && <div className=\"flex justify-end\"><Button className={button3d} onClick={openLeaveDialog}><Plus className=\"ml-2 h-4 w-4\" />طلب إجازة / اعتذار</Button></div>}",
    ),
    (
        "<DialogTitle className=\"flex items-center gap-2 text-xl font-black md:text-2xl\"><Wrench className=\"h-5 w-5 text-sky-700\" />إنشاء طلب صيانة أو احتياج</DialogTitle>",
        "<DialogTitle className=\"flex items-center gap-2 text-xl font-black md:text-2xl\"><Wrench className=\"h-5 w-5 text-sky-700\" />الإبلاغ عن مشكلة / طلب صيانة أو احتياج</DialogTitle>",
    ),
    (
        "<DialogDescription>سجل الطلب بشكل واضح مع تحديد الموقع والأولوية وإرفاق ما يدعم الطلب عند الحاجة.</DialogDescription>",
        "<DialogDescription>هذه الخدمة مخصصة للإمام والمؤذن والخطيب والخطيب المتعاون للإبلاغ عن مشكلة في المسجد أو الجامع أو المصلى وطلب الصيانة أو الاحتياج.</DialogDescription>",
    ),
    (
        "<UserPlus className=\"ml-2 h-4 w-4\" />إضافة منسوب مسجد</Button>",
        "<UserPlus className=\"ml-2 h-4 w-4\" />إضافة منسوب مسجد / جامع / مصلى</Button>",
    ),
    (
        "<DialogTitle className=\"flex items-center gap-2 text-xl font-black md:text-2xl\"><UserPlus className=\"h-5 w-5 text-sky-700\" />إضافة منسوب مسجد / مصلى</DialogTitle>",
        "<DialogTitle className=\"flex items-center gap-2 text-xl font-black md:text-2xl\"><UserPlus className=\"h-5 w-5 text-sky-700\" />إضافة منسوب مسجد / جامع / مصلى</DialogTitle>",
    ),
    (
        "<div className=\"rounded-2xl border border-sky-200 bg-sky-50/70 p-4 text-sm leading-6 text-slate-700\">عند الحفظ يتم إنشاء حساب دخول جديد إذا لم يكن البريد مسجلًا، أو ربط الحساب الموجود. الحساب الجديد يستلم رابط التفعيل وبيانات الدخول عبر البريد الإلكتروني.</div>",
        "<div className=\"rounded-2xl border border-sky-200 bg-sky-50/70 p-4 text-sm leading-6 text-slate-700\"><strong>حساب منسوب المسجد:</strong> عند الحفظ يتم إنشاء حساب دخول جديد إذا لم يكن البريد مسجلًا، أو ربط الحساب الموجود. الحساب يمنح المنسوب الدخول إلى موقعه فقط لتقديم طلب صيانة/احتياج، إجازة أو اعتذار، متابعة طلباته واستقبال الإشعارات. ويستلم الحساب الجديد رابط التفعيل وبيانات الدخول عبر البريد الإلكتروني.</div>",
    ),
]

for old, new in replacements:
    if old not in s:
        raise RuntimeError(f'anchor not found: {old[:120]}')
    s = s.replace(old, new, 1)

path.write_text(s, encoding='utf-8')
