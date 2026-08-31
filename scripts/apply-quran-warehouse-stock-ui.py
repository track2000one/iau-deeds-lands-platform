from pathlib import Path

api_path = Path('src/app/api/mosques.ts')
page_path = Path('src/app/pages/MosquesUnitPage.tsx')
api = api_path.read_text(encoding='utf-8')
page = page_path.read_text(encoding='utf-8')


def replace_once(text: str, old: str, new: str, label: str) -> str:
    count = text.count(old)
    if count != 1:
        raise SystemExit(f'{label}: expected 1 match, found {count}')
    return text.replace(old, new, 1)

# -----------------------------------------------------------------------------
# API types and methods.
# -----------------------------------------------------------------------------
if 'export type MosqueQuranStockDashboard' not in api:
    marker = 'export type MosqueAssignment = {'
    idx = api.find(marker)
    if idx < 0:
        raise SystemExit('MosqueAssignment marker not found in API file')
    types = r'''export type MosqueQuranStockCount = {
  largeCount: number;
  mediumCount: number;
  smallCount: number;
  totalCount: number;
};

export type MosqueQuranWarehouse = {
  id: string;
  code: string;
  name: string;
  location?: string | null;
  active: boolean;
  minLargeCount: number;
  minMediumCount: number;
  minSmallCount: number;
  notes?: string | null;
  balance: MosqueQuranStockCount;
  shortage: MosqueQuranStockCount;
  lowStock: boolean;
  createdAt: string;
  updatedAt: string;
};

export type MosqueQuranStockMovement = {
  id: string;
  movementNumber: string;
  movementType: 'receipt' | 'distribution' | 'return' | 'warehouse_damage' | 'adjustment_in' | 'adjustment_out';
  warehouseId: string;
  siteId?: string | null;
  largeCount: number;
  mediumCount: number;
  smallCount: number;
  totalCount: number;
  referenceNumber?: string | null;
  movementAt: string;
  notes?: string | null;
  createdBy?: string | null;
  createdByName?: string | null;
  createdAt: string;
  warehouse?: { id: string; code: string; name: string };
  site?: { id: string; name: string; siteType?: string; prayerRoomGender?: string | null } | null;
};

export type MosqueQuranStockDashboard = {
  warehouses: MosqueQuranWarehouse[];
  summary: {
    warehouseTotal: number;
    warehouseLarge: number;
    warehouseMedium: number;
    warehouseSmall: number;
    receivedTotal: number;
    distributedTotal: number;
    returnedTotal: number;
    damagedTotal: number;
    siteSystemTotal: number;
    siteNeedTotal: number;
    lowStockWarehouses: number;
    shortageTotal: number;
  };
  sites: Array<{
    site: Pick<MosqueSite, 'id' | 'name' | 'siteType' | 'prayerRoomGender' | 'city' | 'district' | 'campusLocation'>;
    latestInventory: MosqueQuranInventory | null;
    systemStock: MosqueQuranStockCount;
  }>;
  recentMovements: MosqueQuranStockMovement[];
};

'''
    api = api[:idx] + types + api[idx:]

if 'quranStockDashboard:' not in api:
    old = "  createQuranInventory: (input: Record<string, unknown>) => apiJson<MosqueQuranInventory>('/api/mosques/quran-inventory', { method: 'POST', body: JSON.stringify(input) }),\n"
    new = old + r'''
  quranStockDashboard: () => apiJson<MosqueQuranStockDashboard>('/api/mosques/quran-stock/dashboard'),
  quranStockMovements: () => apiJson<MosqueQuranStockMovement[]>('/api/mosques/quran-stock/movements'),
  createQuranWarehouse: (input: Record<string, unknown>) => apiJson<MosqueQuranWarehouse>('/api/mosques/quran-warehouses', { method: 'POST', body: JSON.stringify(input) }),
  updateQuranWarehouse: (id: string, input: Record<string, unknown>) => apiJson<MosqueQuranWarehouse>(`/api/mosques/quran-warehouses/${id}`, { method: 'PATCH', body: JSON.stringify(input) }),
  createQuranStockMovement: (input: Record<string, unknown>) => apiJson<MosqueQuranStockMovement>('/api/mosques/quran-stock/movements', { method: 'POST', body: JSON.stringify(input) }),
'''
    api = replace_once(api, old, new, 'Quran stock API methods')

# -----------------------------------------------------------------------------
# Page imports, constants, state and loading.
# -----------------------------------------------------------------------------
if 'type MosqueQuranStockDashboard,' not in page:
    old = '  type MosqueQuranInventorySummary,\n'
    new = old + '  type MosqueQuranStockDashboard,\n'
    page = replace_once(page, old, new, 'Quran stock dashboard type import')

if 'const quranStockMovementTypeLabels' not in page:
    marker = 'const emptyQuranSummary: MosqueQuranInventorySummary = { sites: 0, countedSites: 0, total: 0, large: 0, medium: 0, small: 0, damaged: 0, needed: 0 };\n'
    additions = marker + r'''
const quranStockMovementTypeLabels: Record<string, string> = {
  receipt: 'توريد / استلام للمستودع',
  distribution: 'صرف وتوزيع لمسجد / مصلى',
  return: 'إرجاع من مسجد / مصلى',
  warehouse_damage: 'استبعاد تالف من المستودع',
  adjustment_in: 'تسوية زيادة',
  adjustment_out: 'تسوية نقص',
};
const emptyQuranWarehouseForm = () => ({ code: '', name: 'المستودع المركزي للمصاحف', location: '', minLargeCount: '0', minMediumCount: '0', minSmallCount: '0', notes: '' });
const emptyQuranStockMovementForm = () => ({ movementType: 'receipt', warehouseId: '', siteId: '', largeCount: '0', mediumCount: '0', smallCount: '0', referenceNumber: '', movementAt: new Date().toISOString().slice(0, 10), notes: '' });
'''
    page = replace_once(page, marker, additions, 'Quran stock constants')

if 'const [quranStockDashboard' not in page:
    old = '  const [quranHistoryLoading, setQuranHistoryLoading] = useState(false);\n'
    new = old + r'''  const [quranStockDashboard, setQuranStockDashboard] = useState<MosqueQuranStockDashboard | null>(null);
  const [quranWarehouseDialog, setQuranWarehouseDialog] = useState(false);
  const [quranWarehouseForm, setQuranWarehouseForm] = useState<any>(emptyQuranWarehouseForm());
  const [quranStockMovementDialog, setQuranStockMovementDialog] = useState(false);
  const [quranStockMovementForm, setQuranStockMovementForm] = useState<any>(emptyQuranStockMovementForm());
  const [quranStockSaving, setQuranStockSaving] = useState(false);
'''
    page = replace_once(page, old, new, 'Quran stock state')

if 'setQuranStockDashboard(await mosqueApi.quranStockDashboard())' not in page:
    old = '''          const quranData = await mosqueApi.quranInventory();
          setQuranInventoryItems(quranData.items || []);
          setQuranSummary(quranData.summary || emptyQuranSummary);'''
    new = '''          const [quranData, quranStockData] = await Promise.all([mosqueApi.quranInventory(), mosqueApi.quranStockDashboard()]);
          setQuranInventoryItems(quranData.items || []);
          setQuranSummary(quranData.summary || emptyQuranSummary);
          setQuranStockDashboard(quranStockData);'''
    page = replace_once(page, old, new, 'Quran stock load')
    old_catch = '''          setQuranInventoryItems([]);
          setQuranSummary(emptyQuranSummary);'''
    new_catch = '''          setQuranInventoryItems([]);
          setQuranSummary(emptyQuranSummary);
          setQuranStockDashboard(null);'''
    page = replace_once(page, old_catch, new_catch, 'Quran stock load fallback')

# -----------------------------------------------------------------------------
# Page handlers.
# -----------------------------------------------------------------------------
if 'const openQuranStockMovement =' not in page:
    marker = '  const openQuranHistory = async (site: MosqueSite) => {'
    idx = page.find(marker)
    if idx < 0:
        raise SystemExit('openQuranHistory marker not found')
    handlers = r'''  const openQuranWarehouse = () => {
    setQuranWarehouseForm(emptyQuranWarehouseForm());
    setQuranWarehouseDialog(true);
  };

  const saveQuranWarehouse = async () => {
    const counts = ['minLargeCount', 'minMediumCount', 'minSmallCount'] as const;
    const parsed = Object.fromEntries(counts.map((key) => [key, Number(quranWarehouseForm[key] || 0)]));
    if (!String(quranWarehouseForm.name || '').trim()) return toast.error('اسم المستودع إلزامي');
    if (counts.some((key) => !Number.isInteger(parsed[key]) || parsed[key] < 0)) return toast.error('الحدود الدنيا يجب أن تكون أرقامًا صحيحة غير سالبة');
    setQuranStockSaving(true);
    try {
      await mosqueApi.createQuranWarehouse({
        code: quranWarehouseForm.code || null,
        name: quranWarehouseForm.name,
        location: quranWarehouseForm.location || null,
        ...parsed,
        notes: quranWarehouseForm.notes || null,
      });
      toast.success('تم إنشاء مستودع المصاحف');
      setQuranWarehouseDialog(false);
      await loadAll();
    } catch (error) { toast.error(error instanceof Error ? error.message : 'تعذر إنشاء مستودع المصاحف'); }
    finally { setQuranStockSaving(false); }
  };

  const openQuranStockMovement = (movementType: string) => {
    const activeWarehouse = quranStockDashboard?.warehouses.find((item) => item.active) || quranStockDashboard?.warehouses[0];
    setQuranStockMovementForm({
      ...emptyQuranStockMovementForm(),
      movementType,
      warehouseId: activeWarehouse?.id || '',
      siteId: ['distribution', 'return'].includes(movementType) ? (sites[0]?.id || '') : '',
    });
    setQuranStockMovementDialog(true);
  };

  const saveQuranStockMovement = async () => {
    const values = ['largeCount', 'mediumCount', 'smallCount'] as const;
    const parsed = Object.fromEntries(values.map((key) => [key, Number(quranStockMovementForm[key] || 0)])) as Record<typeof values[number], number>;
    if (!quranStockMovementForm.warehouseId) return toast.error('اختر مستودع المصاحف');
    if (values.some((key) => !Number.isInteger(parsed[key]) || parsed[key] < 0)) return toast.error('الكميات يجب أن تكون أرقامًا صحيحة غير سالبة');
    if ((parsed.largeCount + parsed.mediumCount + parsed.smallCount) <= 0) return toast.error('أدخل كمية واحدة على الأقل');
    if (['distribution', 'return'].includes(quranStockMovementForm.movementType) && !quranStockMovementForm.siteId) return toast.error('اختر المسجد أو المصلى');
    setQuranStockSaving(true);
    try {
      await mosqueApi.createQuranStockMovement({
        movementType: quranStockMovementForm.movementType,
        warehouseId: quranStockMovementForm.warehouseId,
        siteId: ['distribution', 'return'].includes(quranStockMovementForm.movementType) ? quranStockMovementForm.siteId : null,
        ...parsed,
        referenceNumber: quranStockMovementForm.referenceNumber || null,
        movementAt: quranStockMovementForm.movementAt || new Date().toISOString(),
        notes: quranStockMovementForm.notes || null,
      });
      toast.success(quranStockMovementForm.movementType === 'distribution' ? 'تم صرف المصاحف وخصمها من رصيد المستودع' : quranStockMovementForm.movementType === 'receipt' ? 'تم إضافة التوريد إلى رصيد المستودع' : 'تم تسجيل حركة المخزون بنجاح');
      setQuranStockMovementDialog(false);
      await loadAll();
    } catch (error) { toast.error(error instanceof Error ? error.message : 'تعذر تسجيل حركة مخزون المصاحف'); }
    finally { setQuranStockSaving(false); }
  };

'''
    page = page[:idx] + handlers + page[idx:]

# -----------------------------------------------------------------------------
# Main warehouse dashboard UI inside the Quran tab.
# -----------------------------------------------------------------------------
if 'مستودع المصاحف والتوزيع' not in page:
    marker = '        <TabsContent value="quran" className="space-y-4">\n'
    idx = page.find(marker)
    if idx < 0:
        raise SystemExit('Quran tab marker not found')
    idx += len(marker)
    warehouse_ui = r'''          <Card className={`${card3d} overflow-hidden border-amber-200/80`}>
            <CardHeader className="gap-4 border-b border-amber-100 bg-gradient-to-l from-amber-50 via-white to-emerald-50 xl:flex-row xl:items-center xl:justify-between">
              <div>
                <CardTitle className="flex items-center gap-2 text-xl"><span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-amber-300 to-emerald-500 text-white shadow-[0_0_20px_rgba(245,158,11,0.35)]"><BookOpen className="h-5 w-5" /></span>مستودع المصاحف والتوزيع</CardTitle>
                <CardDescription className="mt-2">تسجيل المصاحف أولًا في المستودع المركزي، ثم صرفها للمساجد والمصليات مع الخصم التلقائي من الرصيد وحفظ سجل كل حركة.</CardDescription>
              </div>
              {role === 'head' && <div className="flex flex-wrap gap-2">
                <Button variant="outline" className={button3d} onClick={openQuranWarehouse}><Plus className="ml-1 h-4 w-4" />إضافة مستودع</Button>
                <Button className="bg-emerald-700 hover:bg-emerald-600" onClick={() => openQuranStockMovement('receipt')} disabled={!quranStockDashboard?.warehouses.length}><Plus className="ml-1 h-4 w-4" />توريد للمستودع</Button>
                <Button className="bg-sky-700 hover:bg-sky-600" onClick={() => openQuranStockMovement('distribution')} disabled={!quranStockDashboard?.warehouses.length}><ExternalLink className="ml-1 h-4 w-4" />صرف وتوزيع</Button>
                <Button variant="outline" className="border-amber-300 text-amber-800" onClick={() => openQuranStockMovement('return')} disabled={!quranStockDashboard?.warehouses.length}><RefreshCw className="ml-1 h-4 w-4" />إرجاع للمستودع</Button>
              </div>}
            </CardHeader>
            <CardContent className="space-y-5 pt-5">
              <div className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-8">
                <ReportMetric label="رصيد المستودعات" value={quranStockDashboard?.summary.warehouseTotal || 0} />
                <ReportMetric label="الكبيرة بالمستودع" value={quranStockDashboard?.summary.warehouseLarge || 0} />
                <ReportMetric label="المتوسطة بالمستودع" value={quranStockDashboard?.summary.warehouseMedium || 0} />
                <ReportMetric label="الصغيرة بالمستودع" value={quranStockDashboard?.summary.warehouseSmall || 0} />
                <ReportMetric label="إجمالي المورد" value={quranStockDashboard?.summary.receivedTotal || 0} />
                <ReportMetric label="إجمالي الموزع" value={quranStockDashboard?.summary.distributedTotal || 0} />
                <ReportMetric label="المرتجع" value={quranStockDashboard?.summary.returnedTotal || 0} />
                <ReportMetric label="احتياج المواقع" value={quranStockDashboard?.summary.siteNeedTotal || 0} />
              </div>

              {(quranStockDashboard?.summary.lowStockWarehouses || 0) > 0 && <div className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-900"><AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" /><div><p className="font-black">تنبيه مخزون منخفض</p><p className="mt-1">يوجد {quranStockDashboard?.summary.lowStockWarehouses} مستودع تحت الحد الأدنى، وإجمالي الكمية المطلوب توفيرها للوصول إلى حدود الأمان هو {quranStockDashboard?.summary.shortageTotal || 0} مصحف.</p></div></div>}

              {!quranStockDashboard?.warehouses.length ? <div className="rounded-2xl border border-dashed border-amber-300 bg-amber-50/50 p-8 text-center"><BookOpen className="mx-auto h-10 w-10 text-amber-600" /><p className="mt-3 font-black text-slate-800">لم يتم إنشاء مستودع للمصاحف بعد</p><p className="mt-1 text-sm text-muted-foreground">ابدأ بإنشاء المستودع المركزي ثم سجل أول توريد قبل توزيع المصاحف على المواقع.</p>{role === 'head' && <Button className="mt-4 bg-emerald-700 hover:bg-emerald-600" onClick={openQuranWarehouse}><Plus className="ml-2 h-4 w-4" />إنشاء المستودع المركزي</Button>}</div> : <div className="grid gap-4 xl:grid-cols-2">{quranStockDashboard.warehouses.map((warehouse) => <Card key={warehouse.id} className={`border-2 ${warehouse.lowStock ? 'border-red-200 bg-red-50/20' : 'border-emerald-200 bg-emerald-50/20'}`}><CardContent className="p-5"><div className="flex flex-wrap items-start justify-between gap-3"><div><div className="flex items-center gap-2"><h3 className="font-black text-slate-900">{warehouse.name}</h3><Badge variant="outline">{warehouse.code}</Badge></div><p className="mt-1 text-xs text-muted-foreground">{warehouse.location || 'لم يحدد موقع المستودع'}</p></div>{warehouse.lowStock ? <Badge className="bg-red-600">مخزون منخفض</Badge> : <Badge className="bg-emerald-600">الرصيد آمن</Badge>}</div><div className="mt-4 grid grid-cols-4 gap-2 text-center"><div className="rounded-xl border bg-white p-3"><p className="text-xs text-muted-foreground">الإجمالي</p><p className="mt-1 text-2xl font-black text-emerald-700">{warehouse.balance.totalCount}</p></div><div className="rounded-xl border bg-white p-3"><p className="text-xs text-muted-foreground">كبير</p><p className="mt-1 text-xl font-black">{warehouse.balance.largeCount}</p><p className="text-[10px] text-muted-foreground">حد أدنى {warehouse.minLargeCount}</p></div><div className="rounded-xl border bg-white p-3"><p className="text-xs text-muted-foreground">متوسط</p><p className="mt-1 text-xl font-black">{warehouse.balance.mediumCount}</p><p className="text-[10px] text-muted-foreground">حد أدنى {warehouse.minMediumCount}</p></div><div className="rounded-xl border bg-white p-3"><p className="text-xs text-muted-foreground">صغير</p><p className="mt-1 text-xl font-black">{warehouse.balance.smallCount}</p><p className="text-[10px] text-muted-foreground">حد أدنى {warehouse.minSmallCount}</p></div></div>{warehouse.lowStock && <p className="mt-3 rounded-xl bg-red-100/70 px-3 py-2 text-xs font-bold text-red-800">الناقص حتى حد الأمان: كبير {warehouse.shortage.largeCount} — متوسط {warehouse.shortage.mediumCount} — صغير {warehouse.shortage.smallCount}</p>}</CardContent></Card>)}</div>}

              <div>
                <div className="mb-3 flex items-center justify-between gap-3"><div><p className="font-black text-slate-800">آخر حركات المصاحف</p><p className="text-xs text-muted-foreground">سجل التوريد والصرف والتوزيع والإرجاع والتسويات.</p></div><Badge variant="outline">{quranStockDashboard?.recentMovements.length || 0} حركة ظاهرة</Badge></div>
                {quranStockDashboard?.recentMovements.length ? <div className="overflow-x-auto rounded-2xl border"><table className="w-full min-w-[1000px] text-sm"><thead className="bg-slate-50"><tr><th className="p-3">رقم الحركة</th><th className="p-3">النوع</th><th className="p-3">المستودع</th><th className="p-3">المسجد / المصلى</th><th className="p-3">كبير</th><th className="p-3">متوسط</th><th className="p-3">صغير</th><th className="p-3">الإجمالي</th><th className="p-3">التاريخ</th></tr></thead><tbody>{quranStockDashboard.recentMovements.slice(0, 20).map((movement) => <tr key={movement.id} className="border-t"><td className="p-3 text-center font-mono text-xs">{movement.movementNumber}</td><td className="p-3 text-center"><Badge variant="outline">{quranStockMovementTypeLabels[movement.movementType] || movement.movementType}</Badge></td><td className="p-3 text-center">{movement.warehouse?.name || '-'}</td><td className="p-3 text-center">{movement.site?.name || '-'}</td><td className="p-3 text-center">{movement.largeCount}</td><td className="p-3 text-center">{movement.mediumCount}</td><td className="p-3 text-center">{movement.smallCount}</td><td className="p-3 text-center font-black text-emerald-700">{movement.totalCount}</td><td className="p-3 text-center text-xs">{new Date(movement.movementAt).toLocaleDateString('ar-SA-u-ca-gregory')}</td></tr>)}</tbody></table></div> : <div className="rounded-2xl border border-dashed p-6 text-center text-sm text-muted-foreground">لا توجد حركات مخزون مسجلة حتى الآن.</div>}
              </div>
            </CardContent>
          </Card>

'''
    page = page[:idx] + warehouse_ui + page[idx:]

# -----------------------------------------------------------------------------
# Warehouse and stock movement dialogs before the existing physical inventory dialog.
# -----------------------------------------------------------------------------
if '<Dialog open={quranWarehouseDialog}' not in page:
    marker = '      <Dialog open={quranDialog} onOpenChange={setQuranDialog}>\n'
    idx = page.find(marker)
    if idx < 0:
        raise SystemExit('quranDialog marker not found')
    dialogs = r'''      <Dialog open={quranWarehouseDialog} onOpenChange={setQuranWarehouseDialog}>
        <DialogContent className="max-h-[92vh] overflow-hidden p-0 gap-0 border-amber-200/80 sm:max-w-[820px]" dir="rtl">
          <DialogHeader className="border-b border-amber-100 bg-gradient-to-l from-amber-50 via-white to-emerald-50 p-5 text-right"><DialogTitle className="flex items-center gap-2 text-xl font-black"><BookOpen className="h-5 w-5 text-emerald-700" />إنشاء مستودع المصاحف</DialogTitle><DialogDescription>يمكن إنشاء مستودع مركزي الآن، مع إمكانية إضافة مستودعات أخرى مستقبلًا وربط كل حركة بالمستودع الصحيح.</DialogDescription></DialogHeader>
          <div className="max-h-[calc(92vh-150px)] space-y-4 overflow-y-auto p-5 md:p-6">
            <div className="grid gap-4 md:grid-cols-2"><Field label="اسم المستودع *"><Input value={quranWarehouseForm.name} onChange={(e) => setQuranWarehouseForm({ ...quranWarehouseForm, name: e.target.value })} placeholder="مثال: المستودع المركزي للمصاحف" /></Field><Field label="رمز المستودع"><Input value={quranWarehouseForm.code} onChange={(e) => setQuranWarehouseForm({ ...quranWarehouseForm, code: e.target.value })} placeholder="يولد تلقائيًا عند تركه فارغًا" /></Field><div className="md:col-span-2"><Field label="موقع المستودع"><Input value={quranWarehouseForm.location} onChange={(e) => setQuranWarehouseForm({ ...quranWarehouseForm, location: e.target.value })} placeholder="المبنى / الحرم / الغرفة أو الوصف المكاني" /></Field></div></div>
            <Card className="border-amber-200"><CardHeader className="pb-3"><CardTitle className="text-base">حدود التنبيه للمخزون</CardTitle><CardDescription>عندما يقل الرصيد عن هذه الحدود يظهر تنبيه تلقائي بالحاجة إلى التوريد.</CardDescription></CardHeader><CardContent className="grid gap-4 md:grid-cols-3"><Field label="الحد الأدنى للكبير"><Input type="number" min="0" step="1" value={quranWarehouseForm.minLargeCount} onChange={(e) => setQuranWarehouseForm({ ...quranWarehouseForm, minLargeCount: e.target.value })} /></Field><Field label="الحد الأدنى للمتوسط"><Input type="number" min="0" step="1" value={quranWarehouseForm.minMediumCount} onChange={(e) => setQuranWarehouseForm({ ...quranWarehouseForm, minMediumCount: e.target.value })} /></Field><Field label="الحد الأدنى للصغير"><Input type="number" min="0" step="1" value={quranWarehouseForm.minSmallCount} onChange={(e) => setQuranWarehouseForm({ ...quranWarehouseForm, minSmallCount: e.target.value })} /></Field></CardContent></Card>
            <Field label="ملاحظات"><Textarea rows={3} value={quranWarehouseForm.notes} onChange={(e) => setQuranWarehouseForm({ ...quranWarehouseForm, notes: e.target.value })} /></Field>
          </div>
          <DialogFooter className="border-t bg-white p-4 md:px-6"><Button variant="outline" onClick={() => setQuranWarehouseDialog(false)}>إلغاء</Button><Button className="bg-emerald-700 hover:bg-emerald-600" onClick={saveQuranWarehouse} disabled={quranStockSaving}><Save className="ml-2 h-4 w-4" />{quranStockSaving ? 'جاري الحفظ...' : 'إنشاء المستودع'}</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={quranStockMovementDialog} onOpenChange={setQuranStockMovementDialog}>
        <DialogContent className="max-h-[92vh] overflow-hidden p-0 gap-0 border-emerald-200/80 sm:max-w-[900px]" dir="rtl">
          <DialogHeader className="border-b border-emerald-100 bg-gradient-to-l from-emerald-50 via-white to-sky-50 p-5 text-right"><DialogTitle className="flex items-center gap-2 text-xl font-black"><BookOpen className="h-5 w-5 text-emerald-700" />حركة مخزون المصاحف</DialogTitle><DialogDescription>التوريد يزيد الرصيد، والصرف يخصم من المستودع ويضيف للموقع، والإرجاع يعيد الكمية من الموقع للمستودع. لا يتم تعديل الرصيد يدويًا خارج سجل الحركات.</DialogDescription></DialogHeader>
          <div className="max-h-[calc(92vh-150px)] space-y-5 overflow-y-auto p-5 md:p-6">
            <div className="grid gap-4 md:grid-cols-2"><Field label="نوع الحركة *"><NativeSelect value={quranStockMovementForm.movementType} onChange={(e) => setQuranStockMovementForm({ ...quranStockMovementForm, movementType: e.target.value, siteId: ['distribution', 'return'].includes(e.target.value) ? (quranStockMovementForm.siteId || sites[0]?.id || '') : '' })}>{Object.entries(quranStockMovementTypeLabels).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</NativeSelect></Field><Field label="المستودع *"><NativeSelect value={quranStockMovementForm.warehouseId} onChange={(e) => setQuranStockMovementForm({ ...quranStockMovementForm, warehouseId: e.target.value })}><option value="">اختر المستودع</option>{quranStockDashboard?.warehouses.map((warehouse) => <option key={warehouse.id} value={warehouse.id}>{warehouse.name} — رصيد {warehouse.balance.totalCount}</option>)}</NativeSelect></Field>{['distribution', 'return'].includes(quranStockMovementForm.movementType) && <div className="md:col-span-2"><Field label="المسجد / المصلى *"><NativeSelect value={quranStockMovementForm.siteId} onChange={(e) => setQuranStockMovementForm({ ...quranStockMovementForm, siteId: e.target.value })}><option value="">اختر الموقع</option>{sites.map((site) => <option key={site.id} value={site.id}>{site.name} — {siteTypeDisplayLabel(site)}</option>)}</NativeSelect></Field></div>}</div>
            {quranStockDashboard?.warehouses.find((warehouse) => warehouse.id === quranStockMovementForm.warehouseId) && <div className="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-4"><p className="text-xs font-bold text-emerald-900">الرصيد الحالي للمستودع المحدد</p>{(() => { const balance = quranStockDashboard.warehouses.find((warehouse) => warehouse.id === quranStockMovementForm.warehouseId)!.balance; return <div className="mt-2 grid grid-cols-4 gap-2 text-center"><Info label="الإجمالي" value={balance.totalCount} /><Info label="كبير" value={balance.largeCount} /><Info label="متوسط" value={balance.mediumCount} /><Info label="صغير" value={balance.smallCount} /></div>; })()}</div>}
            <Card className="border-emerald-200"><CardHeader className="pb-3"><CardTitle className="text-base">الكميات حسب الحجم</CardTitle></CardHeader><CardContent className="grid gap-4 md:grid-cols-3"><Field label="المصاحف الكبيرة"><Input type="number" min="0" step="1" inputMode="numeric" value={quranStockMovementForm.largeCount} onChange={(e) => setQuranStockMovementForm({ ...quranStockMovementForm, largeCount: e.target.value })} /></Field><Field label="المصاحف المتوسطة"><Input type="number" min="0" step="1" inputMode="numeric" value={quranStockMovementForm.mediumCount} onChange={(e) => setQuranStockMovementForm({ ...quranStockMovementForm, mediumCount: e.target.value })} /></Field><Field label="المصاحف الصغيرة"><Input type="number" min="0" step="1" inputMode="numeric" value={quranStockMovementForm.smallCount} onChange={(e) => setQuranStockMovementForm({ ...quranStockMovementForm, smallCount: e.target.value })} /></Field></CardContent></Card>
            <div className="grid gap-4 md:grid-cols-2"><Field label="رقم المرجع / سند التوريد"><Input value={quranStockMovementForm.referenceNumber} onChange={(e) => setQuranStockMovementForm({ ...quranStockMovementForm, referenceNumber: e.target.value })} /></Field><Field label="تاريخ الحركة"><Input type="date" value={quranStockMovementForm.movementAt} onChange={(e) => setQuranStockMovementForm({ ...quranStockMovementForm, movementAt: e.target.value })} /></Field></div>
            <div className="rounded-xl border border-sky-200 bg-sky-50 p-3 text-sm text-sky-900">إجمالي هذه الحركة: <strong>{(Number(quranStockMovementForm.largeCount || 0) + Number(quranStockMovementForm.mediumCount || 0) + Number(quranStockMovementForm.smallCount || 0)).toLocaleString('ar-SA')} مصحف</strong>{quranStockMovementForm.movementType === 'distribution' && ' — سيتم خصمها تلقائيًا من المستودع وإضافتها إلى الرصيد النظامي للموقع.'}</div>
            <Field label="ملاحظات الحركة"><Textarea rows={4} value={quranStockMovementForm.notes} onChange={(e) => setQuranStockMovementForm({ ...quranStockMovementForm, notes: e.target.value })} placeholder="مثال: توريد جديد، صرف لمسجد، إرجاع فائض، سبب التسوية..." /></Field>
          </div>
          <DialogFooter className="border-t bg-white p-4 md:px-6"><Button variant="outline" onClick={() => setQuranStockMovementDialog(false)}>إلغاء</Button><Button className="bg-emerald-700 hover:bg-emerald-600" onClick={saveQuranStockMovement} disabled={quranStockSaving}><Save className="ml-2 h-4 w-4" />{quranStockSaving ? 'جاري التسجيل...' : 'تسجيل الحركة'}</Button></DialogFooter>
        </DialogContent>
      </Dialog>

'''
    page = page[:idx] + dialogs + page[idx:]

api_path.write_text(api, encoding='utf-8')
page_path.write_text(page, encoding='utf-8')
print('Applied Quran warehouse stock frontend feature.')
