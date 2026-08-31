from pathlib import Path

path = Path('src/app/pages/MosquesUnitPage.tsx')
text = path.read_text(encoding='utf-8')


def replace_once(old: str, new: str, label: str):
    global text
    count = text.count(old)
    if count != 1:
        raise SystemExit(f'{label}: expected 1 match, found {count}')
    text = text.replace(old, new, 1)

# 1) Add helper that opens a distribution movement preselected for the requested site.
if 'const openQuranDistributionForSite =' not in text:
    marker = "  const saveQuranStockMovement = async () => {\n"
    helper = """  const openQuranDistributionForSite = (site: MosqueSite) => {\n    const activeWarehouse = quranStockDashboard?.warehouses.find((item) => item.active) || quranStockDashboard?.warehouses[0];\n    if (!activeWarehouse) {\n      toast.error('لا يوجد مستودع مصاحف متاح للصرف');\n      return;\n    }\n    setQuranStockMovementForm({\n      ...emptyQuranStockMovementForm(),\n      movementType: 'distribution',\n      warehouseId: activeWarehouse.id,\n      siteId: site.id,\n    });\n    setQuranStockMovementDialog(true);\n  };\n\n"""
    replace_once(marker, helper + marker, 'distribution helper marker')

# 2) Site cards: pass a dedicated warehouse-distribution action for head role.
old_map = "onQuranInventory={['head', 'supervisor', 'personnel'].includes(role) ? () => openQuranInventoryDialog(site) : undefined} quranInventory={quranLatestBySite[site.id] as MosqueQuranInventory | null | undefined} />"
new_map = "onQuranInventory={['head', 'supervisor', 'personnel'].includes(role) ? () => openQuranInventoryDialog(site) : undefined} onQuranDistribution={role === 'head' ? () => openQuranDistributionForSite(site) : undefined} quranInventory={quranLatestBySite[site.id] as MosqueQuranInventory | null | undefined} />"
if old_map in text:
    replace_once(old_map, new_map, 'site card props')

# 3) Table action: separate physical count from warehouse distribution.
old_table_action = '''<span className="relative">إضافة / تحديث المصاحف</span>\n</Button><Button size="sm" variant="outline" className={button3d} onClick={() => openQuranHistory(site)}><Clock3 className="ml-1 h-3.5 w-3.5" />السجل</Button>'''
new_table_action = '''<span className="relative">تسجيل جرد فعلي</span>\n</Button>{role === 'head' && <Button size="sm" className={`${button3d} bg-sky-700 hover:bg-sky-600`} onClick={() => openQuranDistributionForSite(site)}><ExternalLink className="ml-1 h-3.5 w-3.5" />صرف من المستودع</Button>}<Button size="sm" variant="outline" className={button3d} onClick={() => openQuranHistory(site)}><Clock3 className="ml-1 h-3.5 w-3.5" />السجل</Button>'''
if old_table_action in text:
    replace_once(old_table_action, new_table_action, 'quran table actions')

# 4) Inventory dialog: explain that physical counting does not change warehouse stock.
old_dialog_desc = "<DialogDescription>{quranInventorySite?.name || ''} — كل حفظ ينشئ سجل جرد جديدًا ويحافظ على السجلات السابقة.</DialogDescription>"
new_dialog_desc = "<DialogDescription>{quranInventorySite?.name || ''} — هذا جرد فعلي للموجود بالموقع ولا يخصم من المستودع. لإضافة مصاحف من المكتبة استخدم «صرف من المستودع».</DialogDescription>"
if old_dialog_desc in text:
    replace_once(old_dialog_desc, new_dialog_desc, 'inventory dialog description')

# Add an explicit accounting note inside physical inventory dialog.
old_dialog_body = '''          <div className="max-h-[calc(92vh-150px)] space-y-5 overflow-y-auto p-5 md:p-6">\n            <Card className="border-emerald-200/70">'''
new_dialog_body = '''          <div className="max-h-[calc(92vh-150px)] space-y-5 overflow-y-auto p-5 md:p-6">\n            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm leading-7 text-amber-900"><strong>تنبيه:</strong> الجرد الفعلي هو مطابقة لما هو موجود داخل المسجد أو المصلى، ولا ينشئ حركة صرف ولا يغيّر رصيد المستودع. إذا كانت المصاحف مستلمة من مكتبة المصاحف فسجّلها أولًا عبر «صرف من المستودع» ليتم الخصم تلقائيًا.</div>\n            <Card className="border-emerald-200/70">'''
if old_dialog_body in text:
    replace_once(old_dialog_body, new_dialog_body, 'inventory dialog warning')

# 5) Clarify section copy and physical inventory terminology.
text = text.replace('إدارة وحصر المصاحف</CardTitle><CardDescription>جرد دوري للمصاحف الكبيرة والمتوسطة والصغيرة مع متابعة التالف والاحتياج والاحتفاظ بسجل تاريخي لكل مسجد ومصلى.', 'إدارة وحصر المصاحف</CardTitle><CardDescription>الجرد الفعلي للموجود داخل المساجد والمصليات للمطابقة مع الرصيد النظامي وحركات الصرف من المستودع، مع متابعة التالف والاحتياج.', 1)
text = text.replace('ملاحظة محاسبية للجرد: <strong>إجمالي المصاحف = كبيرة + متوسطة + صغيرة</strong>. عدد المصاحف التالفة يعتبر جزءًا من هذا الإجمالي ويظهر كمؤشر حالة، بينما «الاحتياج» هو العدد المطلوب توفيره للموقع.', 'ملاحظة محاسبية: <strong>هذا الجدول يمثل آخر جرد فعلي للموقع.</strong> إضافة مصحف هنا لا تخصم من المستودع؛ الخصم يتم فقط عبر حركة «صرف وتوزيع». إجمالي الجرد = كبيرة + متوسطة + صغيرة، والتالف جزء من الإجمالي.', 1)

# 6) SiteCard signature gains dedicated distribution callback.
old_sig = "const SiteCard = ({ site, canEdit, canDelete, canPrint, onPreview, onPrint, onEdit, onDelete, onQr, onQuranInventory, quranInventory }: { site: MosqueSite; canEdit: boolean; canDelete: boolean; canPrint: boolean; onPreview: () => void; onPrint: () => void; onEdit: () => void; onDelete: () => void; onQr: () => void; onQuranInventory?: () => void; quranInventory?: MosqueQuranInventory | null }) =>"
new_sig = "const SiteCard = ({ site, canEdit, canDelete, canPrint, onPreview, onPrint, onEdit, onDelete, onQr, onQuranInventory, onQuranDistribution, quranInventory }: { site: MosqueSite; canEdit: boolean; canDelete: boolean; canPrint: boolean; onPreview: () => void; onPrint: () => void; onEdit: () => void; onDelete: () => void; onQr: () => void; onQuranInventory?: () => void; onQuranDistribution?: () => void; quranInventory?: MosqueQuranInventory | null }) =>"
if old_sig in text:
    replace_once(old_sig, new_sig, 'SiteCard signature')

# 7) SiteCard physical inventory badge and buttons become unambiguous.
text = text.replace('<div className="flex items-center gap-2 text-sm font-black text-emerald-900"><BookOpen className="h-4 w-4" />المصاحف</div><Badge variant="outline" className="border-emerald-200 bg-white text-emerald-800">{quranInventory ? `${quranInventory.totalCount} مصحف` : \'لم يتم الجرد\'}</Badge>', '<div className="flex items-center gap-2 text-sm font-black text-emerald-900"><BookOpen className="h-4 w-4" />آخر جرد فعلي للمصاحف</div><Badge variant="outline" className="border-emerald-200 bg-white text-emerald-800">{quranInventory ? `${quranInventory.totalCount} مصحف` : \'لم يتم الجرد\'}</Badge>', 1)
text = text.replace('aria-label={`إضافة أو تحديث المصاحف في ${site.name}`}', 'aria-label={`تسجيل الجرد الفعلي للمصاحف في ${site.name}`}', 1)
text = text.replace('<span className="relative">إضافة / تحديث المصاحف</span>\n</Button>}<div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">', '<span className="relative">تسجيل جرد فعلي</span>\n</Button>}{onQuranDistribution && <Button type="button" onClick={onQuranDistribution} className={`${button3d} mb-3 h-11 w-full bg-sky-700 font-black text-white hover:bg-sky-600`}><ExternalLink className="ml-2 h-4 w-4" />صرف مصاحف من المستودع</Button>}<div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">', 1)

path.write_text(text, encoding='utf-8')
print('Clarified physical Quran inventory vs warehouse distribution and added direct site distribution action.')
