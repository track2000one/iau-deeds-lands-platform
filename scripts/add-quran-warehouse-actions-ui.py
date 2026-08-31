from pathlib import Path
import re

api_path = Path('src/app/api/mosques.ts')
page_path = Path('src/app/pages/MosquesUnitPage.tsx')
api = api_path.read_text(encoding='utf-8')
page = page_path.read_text(encoding='utf-8')


def replace_once(text: str, old: str, new: str, label: str) -> str:
    count = text.count(old)
    if count != 1:
        raise SystemExit(f'{label}: expected 1 match, found {count}')
    return text.replace(old, new, 1)

# API delete action.
if 'deleteQuranWarehouse:' not in api:
    old = "  updateQuranWarehouse: (id: string, input: Record<string, unknown>) => apiJson<MosqueQuranWarehouse>(`/api/mosques/quran-warehouses/${id}`, { method: 'PATCH', body: JSON.stringify(input) }),\n"
    new = old + "  deleteQuranWarehouse: (id: string) => apiJson<void>(`/api/mosques/quran-warehouses/${id}`, { method: 'DELETE' }),\n"
    api = replace_once(api, old, new, 'delete Quran warehouse API')

# Page type import.
if 'type MosqueQuranWarehouse,' not in page:
    page = replace_once(
        page,
        '  type MosqueQuranStockDashboard,\n',
        '  type MosqueQuranStockDashboard,\n  type MosqueQuranWarehouse,\n',
        'MosqueQuranWarehouse import',
    )

# Warehouse form gains active state.
old_empty = "const emptyQuranWarehouseForm = () => ({ code: '', name: 'المستودع المركزي للمصاحف', location: '', minLargeCount: '0', minMediumCount: '0', minSmallCount: '0', notes: '' });"
new_empty = "const emptyQuranWarehouseForm = () => ({ code: '', name: 'المستودع المركزي للمصاحف', location: '', active: true, minLargeCount: '0', minMediumCount: '0', minSmallCount: '0', notes: '' });"
if old_empty in page:
    page = page.replace(old_empty, new_empty, 1)

# Warehouse action state.
if 'const [editingQuranWarehouse' not in page:
    old_state = "  const [quranWarehouseDialog, setQuranWarehouseDialog] = useState(false);\n  const [quranWarehouseForm, setQuranWarehouseForm] = useState<any>(emptyQuranWarehouseForm());\n"
    new_state = old_state + "  const [editingQuranWarehouse, setEditingQuranWarehouse] = useState<MosqueQuranWarehouse | null>(null);\n  const [quranWarehousePreview, setQuranWarehousePreview] = useState<MosqueQuranWarehouse | null>(null);\n"
    page = replace_once(page, old_state, new_state, 'Quran warehouse action state')

# Replace create-only warehouse handlers with create/edit/view/print/delete handlers.
handler_start = page.find('  const openQuranWarehouse = () => {')
handler_end = page.find('  const openQuranStockMovement = (movementType: string) => {', handler_start)
if handler_start < 0 or handler_end < 0:
    raise SystemExit('Quran warehouse handler block markers not found')
if 'const openEditQuranWarehouse =' not in page:
    handlers = r'''  const openQuranWarehouse = () => {
    setEditingQuranWarehouse(null);
    setQuranWarehouseForm(emptyQuranWarehouseForm());
    setQuranWarehouseDialog(true);
  };

  const openEditQuranWarehouse = (warehouse: MosqueQuranWarehouse) => {
    setEditingQuranWarehouse(warehouse);
    setQuranWarehouseForm({
      code: warehouse.code || '',
      name: warehouse.name || '',
      location: warehouse.location || '',
      active: warehouse.active !== false,
      minLargeCount: String(warehouse.minLargeCount ?? 0),
      minMediumCount: String(warehouse.minMediumCount ?? 0),
      minSmallCount: String(warehouse.minSmallCount ?? 0),
      notes: warehouse.notes || '',
    });
    setQuranWarehouseDialog(true);
  };

  const saveQuranWarehouse = async () => {
    const counts = ['minLargeCount', 'minMediumCount', 'minSmallCount'] as const;
    const parsed = Object.fromEntries(counts.map((key) => [key, Number(quranWarehouseForm[key] || 0)]));
    if (!String(quranWarehouseForm.name || '').trim()) return toast.error('اسم المستودع إلزامي');
    if (counts.some((key) => !Number.isInteger(parsed[key]) || parsed[key] < 0)) return toast.error('الحدود الدنيا يجب أن تكون أرقامًا صحيحة غير سالبة');
    setQuranStockSaving(true);
    try {
      const payload = {
        code: editingQuranWarehouse ? (quranWarehouseForm.code || editingQuranWarehouse.code) : (quranWarehouseForm.code || null),
        name: quranWarehouseForm.name,
        location: quranWarehouseForm.location || null,
        active: quranWarehouseForm.active !== false,
        ...parsed,
        notes: quranWarehouseForm.notes || null,
      };
      if (editingQuranWarehouse) {
        await mosqueApi.updateQuranWarehouse(editingQuranWarehouse.id, payload);
        toast.success('تم حفظ تعديلات مستودع المصاحف');
      } else {
        await mosqueApi.createQuranWarehouse(payload);
        toast.success('تم إنشاء مستودع المصاحف');
      }
      setQuranWarehouseDialog(false);
      setEditingQuranWarehouse(null);
      await loadAll();
    } catch (error) { toast.error(error instanceof Error ? error.message : editingQuranWarehouse ? 'تعذر تعديل مستودع المصاحف' : 'تعذر إنشاء مستودع المصاحف'); }
    finally { setQuranStockSaving(false); }
  };

  const deleteQuranWarehouse = async (warehouse: MosqueQuranWarehouse) => {
    if (!window.confirm(`هل تريد حذف المستودع «${warehouse.name}»؟\n\nلن يسمح النظام بالحذف إذا كان المستودع مرتبطًا بحركات مخزون محفوظة حفاظًا على السجل المحاسبي.`)) return;
    setQuranStockSaving(true);
    try {
      await mosqueApi.deleteQuranWarehouse(warehouse.id);
      if (quranWarehousePreview?.id === warehouse.id) setQuranWarehousePreview(null);
      toast.success('تم حذف مستودع المصاحف');
      await loadAll();
    } catch (error) { toast.error(error instanceof Error ? error.message : 'تعذر حذف مستودع المصاحف'); }
    finally { setQuranStockSaving(false); }
  };

  const printQuranWarehouse = (warehouse: MosqueQuranWarehouse) => {
    const printWindow = window.open('', '_blank', 'width=1100,height=850');
    if (!printWindow) return toast.error('تعذر فتح نافذة الطباعة. اسمح بالنوافذ المنبثقة ثم أعد المحاولة.');
    const escapeHtml = (value: unknown) => String(value ?? '').replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[char] || char));
    const movements = (quranStockDashboard?.recentMovements || []).filter((item) => item.warehouseId === warehouse.id).slice(0, 30);
    const movementRows = movements.length
      ? movements.map((movement, index) => `<tr><td>${index + 1}</td><td>${escapeHtml(movement.movementNumber)}</td><td>${escapeHtml(quranStockMovementTypeLabels[movement.movementType] || movement.movementType)}</td><td>${escapeHtml(movement.site?.name || '-')}</td><td>${movement.largeCount}</td><td>${movement.mediumCount}</td><td>${movement.smallCount}</td><td><b>${movement.totalCount}</b></td><td>${escapeHtml(new Date(movement.movementAt).toLocaleDateString('ar-SA-u-ca-gregory'))}</td></tr>`).join('')
      : '<tr><td colspan="9">لا توجد حركات مخزون ظاهرة لهذا المستودع.</td></tr>';
    const status = warehouse.active ? 'مفعّل' : 'غير مفعّل';
    const stockStatus = warehouse.lowStock ? 'مخزون منخفض' : 'الرصيد آمن';
    printWindow.document.write(`<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><title>بطاقة مستودع المصاحف - ${escapeHtml(warehouse.name)}</title><style>@page{size:A4 landscape;margin:10mm}*{box-sizing:border-box;-webkit-print-color-adjust:exact;print-color-adjust:exact}body{font-family:Tahoma,Arial,sans-serif;color:#172033;margin:0;padding:0;direction:rtl}.head{border:2px solid #d6a84b;border-radius:18px;padding:18px;background:linear-gradient(135deg,#fff9e8,#fff,#edfdf5)}h1{margin:0 0 8px;font-size:24px}.meta{display:flex;gap:10px;flex-wrap:wrap;font-size:12px}.pill{padding:6px 10px;border:1px solid #d8dee8;border-radius:999px;background:#fff}.grid{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin:16px 0}.box{border:1px solid #cbd5e1;border-radius:14px;padding:12px;text-align:center}.box small{display:block;color:#64748b;margin-bottom:5px}.box b{font-size:22px}.section{margin-top:18px}.section h2{font-size:16px;margin:0 0 8px}.notes{border:1px solid #e2e8f0;border-radius:12px;padding:10px;min-height:42px;white-space:pre-wrap}table{width:100%;border-collapse:collapse;font-size:11px}th,td{border:1px solid #cbd5e1;padding:7px;text-align:center}th{background:#f8fafc}.warning{background:#fee2e2;color:#991b1b;border:1px solid #fecaca;border-radius:12px;padding:10px;margin-top:12px;font-weight:bold}.footer{margin-top:14px;font-size:10px;color:#64748b;text-align:left}@media print{button{display:none}}</style></head><body><div class="head"><h1>بطاقة مستودع المصاحف</h1><div class="meta"><span class="pill"><b>${escapeHtml(warehouse.name)}</b></span><span class="pill">الرمز: ${escapeHtml(warehouse.code)}</span><span class="pill">الموقع: ${escapeHtml(warehouse.location || '-')}</span><span class="pill">الحالة: ${status}</span><span class="pill">حالة الرصيد: ${stockStatus}</span></div>${warehouse.lowStock ? `<div class="warning">الناقص حتى حد الأمان: كبير ${warehouse.shortage.largeCount} — متوسط ${warehouse.shortage.mediumCount} — صغير ${warehouse.shortage.smallCount}</div>` : ''}</div><div class="grid"><div class="box"><small>الإجمالي</small><b>${warehouse.balance.totalCount}</b></div><div class="box"><small>كبير — الحد الأدنى ${warehouse.minLargeCount}</small><b>${warehouse.balance.largeCount}</b></div><div class="box"><small>متوسط — الحد الأدنى ${warehouse.minMediumCount}</small><b>${warehouse.balance.mediumCount}</b></div><div class="box"><small>صغير — الحد الأدنى ${warehouse.minSmallCount}</small><b>${warehouse.balance.smallCount}</b></div></div><div class="section"><h2>الملاحظات</h2><div class="notes">${escapeHtml(warehouse.notes || 'لا توجد ملاحظات')}</div></div><div class="section"><h2>آخر حركات المخزون الظاهرة</h2><table><thead><tr><th>م</th><th>رقم الحركة</th><th>النوع</th><th>المسجد / المصلى</th><th>كبير</th><th>متوسط</th><th>صغير</th><th>الإجمالي</th><th>التاريخ</th></tr></thead><tbody>${movementRows}</tbody></table></div><div class="footer">تاريخ الطباعة: ${escapeHtml(new Date().toLocaleString('ar-SA-u-ca-gregory'))} — جامعة الإمام عبدالرحمن بن فيصل / وحدة العناية بالمساجد والمصليات الجامعية</div><script>window.onload=()=>setTimeout(()=>window.print(),250)<\/script></body></html>`);
    printWindow.document.close();
  };

'''
    page = page[:handler_start] + handlers + page[handler_end:]

# Replace warehouse cards with action buttons.
if 'onClick={() => setQuranWarehousePreview(warehouse)}' not in page:
    pattern = re.compile(r'<div className="grid gap-4 xl:grid-cols-2">\{quranStockDashboard\.warehouses\.map\(\(warehouse\) => <Card key=\{warehouse\.id\}.*?</Card>\)\}</div>', re.S)
    match = pattern.search(page)
    if not match:
        raise SystemExit('warehouse cards block not found')
    cards = r'''<div className="grid gap-4 xl:grid-cols-2">{quranStockDashboard.warehouses.map((warehouse) => (
                <Card key={warehouse.id} className={`border-2 ${warehouse.lowStock ? 'border-red-200 bg-red-50/20' : 'border-emerald-200 bg-emerald-50/20'}`}>
                  <CardContent className="p-5">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div><div className="flex items-center gap-2"><h3 className="font-black text-slate-900">{warehouse.name}</h3><Badge variant="outline">{warehouse.code}</Badge></div><p className="mt-1 text-xs text-muted-foreground">{warehouse.location || 'لم يحدد موقع المستودع'}</p></div>
                      {warehouse.lowStock ? <Badge className="bg-red-600">مخزون منخفض</Badge> : <Badge className="bg-emerald-600">الرصيد آمن</Badge>}
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2 border-t border-slate-100 pt-3">
                      <Button size="sm" variant="outline" className={button3d} onClick={() => setQuranWarehousePreview(warehouse)}><Eye className="ml-1 h-4 w-4" />معاينة</Button>
                      <Button size="sm" variant="outline" className={button3d} onClick={() => printQuranWarehouse(warehouse)}><Printer className="ml-1 h-4 w-4" />طباعة</Button>
                      {role === 'head' && <><Button size="sm" variant="outline" className={`${button3d} border-sky-200 text-sky-700`} onClick={() => openEditQuranWarehouse(warehouse)}><Pencil className="ml-1 h-4 w-4" />تعديل</Button><Button size="sm" variant="outline" className={`${button3d} border-red-200 text-red-700 hover:bg-red-50`} disabled={quranStockSaving} onClick={() => deleteQuranWarehouse(warehouse)}><Trash2 className="ml-1 h-4 w-4" />حذف</Button></>}
                    </div>
                    <div className="mt-4 grid grid-cols-4 gap-2 text-center"><div className="rounded-xl border bg-white p-3"><p className="text-xs text-muted-foreground">الإجمالي</p><p className="mt-1 text-2xl font-black text-emerald-700">{warehouse.balance.totalCount}</p></div><div className="rounded-xl border bg-white p-3"><p className="text-xs text-muted-foreground">كبير</p><p className="mt-1 text-xl font-black">{warehouse.balance.largeCount}</p><p className="text-[10px] text-muted-foreground">حد أدنى {warehouse.minLargeCount}</p></div><div className="rounded-xl border bg-white p-3"><p className="text-xs text-muted-foreground">متوسط</p><p className="mt-1 text-xl font-black">{warehouse.balance.mediumCount}</p><p className="text-[10px] text-muted-foreground">حد أدنى {warehouse.minMediumCount}</p></div><div className="rounded-xl border bg-white p-3"><p className="text-xs text-muted-foreground">صغير</p><p className="mt-1 text-xl font-black">{warehouse.balance.smallCount}</p><p className="text-[10px] text-muted-foreground">حد أدنى {warehouse.minSmallCount}</p></div></div>
                    {warehouse.lowStock && <p className="mt-3 rounded-xl bg-red-100/70 px-3 py-2 text-xs font-bold text-red-800">الناقص حتى حد الأمان: كبير {warehouse.shortage.largeCount} — متوسط {warehouse.shortage.mediumCount} — صغير {warehouse.shortage.smallCount}</p>}
                  </CardContent>
                </Card>
              ))}</div>'''
    page = page[:match.start()] + cards + page[match.end():]

# Warehouse dialog supports editing and activation status.
page = page.replace(
    '<Dialog open={quranWarehouseDialog} onOpenChange={setQuranWarehouseDialog}>',
    '<Dialog open={quranWarehouseDialog} onOpenChange={(open) => { setQuranWarehouseDialog(open); if (!open) setEditingQuranWarehouse(null); }}>',
    1,
)
page = page.replace(
    '<DialogHeader className="border-b border-amber-100 bg-gradient-to-l from-amber-50 via-white to-emerald-50 p-5 text-right"><DialogTitle className="flex items-center gap-2 text-xl font-black"><BookOpen className="h-5 w-5 text-emerald-700" />إنشاء مستودع المصاحف</DialogTitle><DialogDescription>يمكن إنشاء مستودع مركزي الآن، مع إمكانية إضافة مستودعات أخرى مستقبلًا وربط كل حركة بالمستودع الصحيح.</DialogDescription></DialogHeader>',
    '<DialogHeader className="border-b border-amber-100 bg-gradient-to-l from-amber-50 via-white to-emerald-50 p-5 text-right"><DialogTitle className="flex items-center gap-2 text-xl font-black"><BookOpen className="h-5 w-5 text-emerald-700" />{editingQuranWarehouse ? \'تعديل مستودع المصاحف\' : \'إنشاء مستودع المصاحف\'}</DialogTitle><DialogDescription>{editingQuranWarehouse ? \'تعديل بيانات المستودع وحدود الأمان وحالة التفعيل دون المساس بسجل حركات المخزون.\' : \'يمكن إنشاء مستودع مركزي الآن، مع إمكانية إضافة مستودعات أخرى مستقبلًا وربط كل حركة بالمستودع الصحيح.\'}</DialogDescription></DialogHeader>',
    1,
)
old_fields = '<div className="grid gap-4 md:grid-cols-2"><Field label="اسم المستودع *"><Input value={quranWarehouseForm.name} onChange={(e) => setQuranWarehouseForm({ ...quranWarehouseForm, name: e.target.value })} placeholder="مثال: المستودع المركزي للمصاحف" /></Field><Field label="رمز المستودع"><Input value={quranWarehouseForm.code} onChange={(e) => setQuranWarehouseForm({ ...quranWarehouseForm, code: e.target.value })} placeholder="يولد تلقائيًا عند تركه فارغًا" /></Field><div className="md:col-span-2"><Field label="موقع المستودع"><Input value={quranWarehouseForm.location} onChange={(e) => setQuranWarehouseForm({ ...quranWarehouseForm, location: e.target.value })} placeholder="المبنى / الحرم / الغرفة أو الوصف المكاني" /></Field></div></div>'
new_fields = '<div className="grid gap-4 md:grid-cols-2"><Field label="اسم المستودع *"><Input value={quranWarehouseForm.name} onChange={(e) => setQuranWarehouseForm({ ...quranWarehouseForm, name: e.target.value })} placeholder="مثال: المستودع المركزي للمصاحف" /></Field><Field label="رمز المستودع"><Input value={quranWarehouseForm.code} onChange={(e) => setQuranWarehouseForm({ ...quranWarehouseForm, code: e.target.value })} placeholder="يولد تلقائيًا عند تركه فارغًا" /></Field><div className="md:col-span-2"><Field label="موقع المستودع"><Input value={quranWarehouseForm.location} onChange={(e) => setQuranWarehouseForm({ ...quranWarehouseForm, location: e.target.value })} placeholder="المبنى / الحرم / الغرفة أو الوصف المكاني" /></Field></div><Field label="حالة المستودع"><NativeSelect value={quranWarehouseForm.active === false ? \'inactive\' : \'active\'} onChange={(e) => setQuranWarehouseForm({ ...quranWarehouseForm, active: e.target.value === \'active\' })}><option value="active">مفعّل</option><option value="inactive">غير مفعّل / موقوف</option></NativeSelect></Field></div>'
if old_fields in page:
    page = page.replace(old_fields, new_fields, 1)
page = page.replace(
    "{quranStockSaving ? 'جاري الحفظ...' : 'إنشاء المستودع'}",
    "{quranStockSaving ? 'جاري الحفظ...' : editingQuranWarehouse ? 'حفظ التعديلات' : 'إنشاء المستودع'}",
    1,
)

# Preview dialog before warehouse edit/create dialog.
if '<Dialog open={Boolean(quranWarehousePreview)}' not in page:
    marker = '      <Dialog open={quranWarehouseDialog} onOpenChange={(open) => { setQuranWarehouseDialog(open); if (!open) setEditingQuranWarehouse(null); }}>'
    idx = page.find(marker)
    if idx < 0:
        raise SystemExit('warehouse dialog marker not found')
    preview = r'''      <Dialog open={Boolean(quranWarehousePreview)} onOpenChange={(open) => !open && setQuranWarehousePreview(null)}>
        <DialogContent className="max-h-[92vh] overflow-hidden p-0 gap-0 border-amber-200/80 sm:max-w-[980px]" dir="rtl">
          {quranWarehousePreview && <>
            <DialogHeader className="border-b border-amber-100 bg-gradient-to-l from-amber-50 via-white to-emerald-50 p-5 text-right"><DialogTitle className="flex items-center gap-2 text-xl font-black"><Eye className="h-5 w-5 text-emerald-700" />معاينة مستودع المصاحف</DialogTitle><DialogDescription>{quranWarehousePreview.name} — {quranWarehousePreview.code}</DialogDescription></DialogHeader>
            <div className="max-h-[calc(92vh-150px)] space-y-5 overflow-y-auto p-5 md:p-6">
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4"><Info label="اسم المستودع" value={quranWarehousePreview.name} /><Info label="الرمز" value={quranWarehousePreview.code} /><Info label="الموقع" value={quranWarehousePreview.location || '-'} /><Info label="الحالة" value={quranWarehousePreview.active ? 'مفعّل' : 'غير مفعّل'} /></div>
              <Card className={quranWarehousePreview.lowStock ? 'border-red-200 bg-red-50/30' : 'border-emerald-200 bg-emerald-50/30'}><CardHeader className="pb-3"><div className="flex items-center justify-between gap-3"><CardTitle className="text-base">الرصيد الحالي وحدود الأمان</CardTitle>{quranWarehousePreview.lowStock ? <Badge className="bg-red-600">مخزون منخفض</Badge> : <Badge className="bg-emerald-600">الرصيد آمن</Badge>}</div></CardHeader><CardContent className="grid grid-cols-2 gap-3 md:grid-cols-4"><Info label="الإجمالي" value={quranWarehousePreview.balance.totalCount.toLocaleString('ar-SA')} /><Info label={`كبير — حد ${quranWarehousePreview.minLargeCount}`} value={quranWarehousePreview.balance.largeCount.toLocaleString('ar-SA')} /><Info label={`متوسط — حد ${quranWarehousePreview.minMediumCount}`} value={quranWarehousePreview.balance.mediumCount.toLocaleString('ar-SA')} /><Info label={`صغير — حد ${quranWarehousePreview.minSmallCount}`} value={quranWarehousePreview.balance.smallCount.toLocaleString('ar-SA')} /></CardContent></Card>
              {quranWarehousePreview.lowStock && <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-800">الناقص حتى حد الأمان: كبير {quranWarehousePreview.shortage.largeCount} — متوسط {quranWarehousePreview.shortage.mediumCount} — صغير {quranWarehousePreview.shortage.smallCount}</div>}
              <Card><CardHeader className="pb-3"><CardTitle className="text-base">الملاحظات</CardTitle></CardHeader><CardContent className="text-sm leading-7 text-slate-700">{quranWarehousePreview.notes || 'لا توجد ملاحظات مسجلة.'}</CardContent></Card>
              <div><div className="mb-2 flex items-center justify-between"><p className="font-black text-slate-800">آخر حركات هذا المستودع</p><Badge variant="outline">{(quranStockDashboard?.recentMovements || []).filter((item) => item.warehouseId === quranWarehousePreview.id).length} حركة ظاهرة</Badge></div><div className="overflow-x-auto rounded-2xl border"><table className="w-full min-w-[850px] text-sm"><thead className="bg-slate-50"><tr><th className="p-3">رقم الحركة</th><th className="p-3">النوع</th><th className="p-3">الموقع المستفيد</th><th className="p-3">كبير</th><th className="p-3">متوسط</th><th className="p-3">صغير</th><th className="p-3">الإجمالي</th><th className="p-3">التاريخ</th></tr></thead><tbody>{(quranStockDashboard?.recentMovements || []).filter((item) => item.warehouseId === quranWarehousePreview.id).slice(0, 15).map((movement) => <tr key={movement.id} className="border-t"><td className="p-3 text-center font-mono text-xs">{movement.movementNumber}</td><td className="p-3 text-center">{quranStockMovementTypeLabels[movement.movementType] || movement.movementType}</td><td className="p-3 text-center">{movement.site?.name || '-'}</td><td className="p-3 text-center">{movement.largeCount}</td><td className="p-3 text-center">{movement.mediumCount}</td><td className="p-3 text-center">{movement.smallCount}</td><td className="p-3 text-center font-black">{movement.totalCount}</td><td className="p-3 text-center text-xs">{new Date(movement.movementAt).toLocaleDateString('ar-SA-u-ca-gregory')}</td></tr>)}{!(quranStockDashboard?.recentMovements || []).some((item) => item.warehouseId === quranWarehousePreview.id) && <tr><td colSpan={8} className="p-6 text-center text-muted-foreground">لا توجد حركات مخزون ظاهرة لهذا المستودع.</td></tr>}</tbody></table></div></div>
            </div>
            <DialogFooter className="border-t bg-white p-4 md:px-6"><Button variant="outline" onClick={() => setQuranWarehousePreview(null)}>إغلاق</Button><Button variant="outline" onClick={() => printQuranWarehouse(quranWarehousePreview)}><Printer className="ml-2 h-4 w-4" />طباعة</Button>{role === 'head' && <Button className="bg-sky-700 hover:bg-sky-600" onClick={() => { const warehouse = quranWarehousePreview; setQuranWarehousePreview(null); openEditQuranWarehouse(warehouse); }}><Pencil className="ml-2 h-4 w-4" />تعديل</Button>}</DialogFooter>
          </>}
        </DialogContent>
      </Dialog>

'''
    page = page[:idx] + preview + page[idx:]

api_path.write_text(api, encoding='utf-8')
page_path.write_text(page, encoding='utf-8')
print('Added Quran warehouse preview/edit/print/delete UI actions.')
