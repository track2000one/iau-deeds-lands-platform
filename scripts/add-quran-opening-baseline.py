from pathlib import Path

api_path = Path('src/app/api/mosques.ts')
page_path = Path('src/app/pages/MosquesUnitPage.tsx')
api = api_path.read_text(encoding='utf-8')
page = page_path.read_text(encoding='utf-8')
api_original = api
page_original = page

# ---------- API types and methods ----------
api_type_anchor = """export type MosqueQuranStockDashboard = {
  warehouses: MosqueQuranWarehouse[];
  summary: {
    warehouseTotal: number;
    warehouseLarge: number;
    warehouseMedium: number;
    warehouseSmall: number;
    receivedTotal: number;
    distributedTotal: number;
    returnedTotal: number;
    withdrawnTotal: number;
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
    withdrawnStock: MosqueQuranStockCount;
  }>;
  recentMovements: MosqueQuranStockMovement[];
};
"""
api_type_replacement = api_type_anchor + """
export type MosqueQuranOpeningBaselineStatus = {
  closed: boolean;
  closedAt?: string | null;
  closedByName?: string | null;
  totalSites: number;
  countedSites: number;
  remainingSites: number;
  items: Array<{
    site: Pick<MosqueSite, 'id' | 'name' | 'siteType' | 'prayerRoomGender' | 'city' | 'district' | 'campusLocation' | 'status'>;
    counted: boolean;
    baseline: null | {
      largeCount: number;
      mediumCount: number;
      smallCount: number;
      totalCount: number;
      recommendedWithdrawalCount: number;
      countedAt: string;
      countedByName?: string | null;
      notes?: string | null;
      inventoryId?: string | null;
    };
  }>;
};
"""
if api_type_anchor not in api:
    raise SystemExit('Missing Quran stock dashboard API type anchor')
api = api.replace(api_type_anchor, api_type_replacement, 1)

api_method_anchor = """  quranStockDashboard: () => apiJson<MosqueQuranStockDashboard>('/api/mosques/quran-stock/dashboard'),
  quranStockMovements: () => apiJson<MosqueQuranStockMovement[]>('/api/mosques/quran-stock/movements'),"""
api_method_replacement = """  quranStockDashboard: () => apiJson<MosqueQuranStockDashboard>('/api/mosques/quran-stock/dashboard'),
  quranOpeningBaselineStatus: () => apiJson<MosqueQuranOpeningBaselineStatus>('/api/mosques/quran-stock/opening-baseline'),
  saveQuranOpeningBaseline: (input: Record<string, unknown>) => apiJson<{ message: string; inventory: MosqueQuranInventory; state: MosqueQuranOpeningBaselineStatus }>('/api/mosques/quran-stock/opening-baseline', { method: 'POST', body: JSON.stringify(input) }),
  closeQuranOpeningBaseline: (confirmation: string) => apiJson<{ message: string; state: MosqueQuranOpeningBaselineStatus }>('/api/mosques/quran-stock/opening-baseline/close', { method: 'POST', body: JSON.stringify({ confirmation }) }),
  quranStockMovements: () => apiJson<MosqueQuranStockMovement[]>('/api/mosques/quran-stock/movements'),"""
if api_method_anchor not in api:
    raise SystemExit('Missing Quran API method anchor')
api = api.replace(api_method_anchor, api_method_replacement, 1)

# ---------- Page import ----------
import_anchor = """  type MosqueQuranInventorySummary,
  type MosqueQuranStockDashboard,"""
import_replacement = """  type MosqueQuranInventorySummary,
  type MosqueQuranOpeningBaselineStatus,
  type MosqueQuranStockDashboard,"""
if import_anchor not in page:
    raise SystemExit('Missing Quran page import anchor')
page = page.replace(import_anchor, import_replacement, 1)

# ---------- Opening baseline form ----------
form_anchor = """const emptyQuranSummary: MosqueQuranInventorySummary = { sites: 0, countedSites: 0, total: 0, large: 0, medium: 0, small: 0, damaged: 0, needed: 0 };
"""
form_replacement = form_anchor + """
const emptyQuranOpeningBaselineForm = () => ({
  largeCount: '0',
  mediumCount: '0',
  smallCount: '0',
  recommendedWithdrawalCount: '0',
  countedAt: new Date().toISOString().slice(0, 10),
  notes: '',
});
"""
if form_anchor not in page:
    raise SystemExit('Missing Quran summary anchor')
page = page.replace(form_anchor, form_replacement, 1)

# ---------- State ----------
state_anchor = """  const [quranStockDashboard, setQuranStockDashboard] = useState<MosqueQuranStockDashboard | null>(null);
  const [quranWarehouseDialog, setQuranWarehouseDialog] = useState(false);"""
state_replacement = """  const [quranStockDashboard, setQuranStockDashboard] = useState<MosqueQuranStockDashboard | null>(null);
  const [quranOpeningBaselineStatus, setQuranOpeningBaselineStatus] = useState<MosqueQuranOpeningBaselineStatus | null>(null);
  const [quranOpeningBaselineDialog, setQuranOpeningBaselineDialog] = useState(false);
  const [quranOpeningBaselineSite, setQuranOpeningBaselineSite] = useState<MosqueSite | null>(null);
  const [quranOpeningBaselineForm, setQuranOpeningBaselineForm] = useState<any>(emptyQuranOpeningBaselineForm());
  const [quranWarehouseDialog, setQuranWarehouseDialog] = useState(false);"""
if state_anchor not in page:
    raise SystemExit('Missing Quran state anchor')
page = page.replace(state_anchor, state_replacement, 1)

# ---------- Load opening status for head ----------
load_anchor = """          setQuranInventoryItems(quranData.items || []);
          setQuranSummary(quranData.summary || emptyQuranSummary);
          setQuranStockDashboard(quranStockData);
        } catch {"""
load_replacement = """          setQuranInventoryItems(quranData.items || []);
          setQuranSummary(quranData.summary || emptyQuranSummary);
          setQuranStockDashboard(quranStockData);
          if (me.role === 'head') {
            try { setQuranOpeningBaselineStatus(await mosqueApi.quranOpeningBaselineStatus()); }
            catch { setQuranOpeningBaselineStatus(null); }
          } else {
            setQuranOpeningBaselineStatus(null);
          }
        } catch {"""
if load_anchor not in page:
    raise SystemExit('Missing Quran load anchor')
page = page.replace(load_anchor, load_replacement, 1)

# ---------- Functions ----------
function_anchor = """  const openQuranDistributionForSite = (site: MosqueSite) => {
"""
opening_functions = """  const openQuranOpeningBaselineForSite = (site: MosqueSite) => {
    if (quranOpeningBaselineStatus?.closed) {
      toast.info('الجرد التأسيسي معتمد ومقفل، ولا يمكن تعديل الرصيد الافتتاحي');
      return;
    }
    const existing = quranOpeningBaselineStatus?.items.find((item) => item.site.id === site.id)?.baseline;
    setQuranOpeningBaselineSite(site);
    setQuranOpeningBaselineForm({
      ...emptyQuranOpeningBaselineForm(),
      largeCount: String(existing?.largeCount ?? 0),
      mediumCount: String(existing?.mediumCount ?? 0),
      smallCount: String(existing?.smallCount ?? 0),
      recommendedWithdrawalCount: String(existing?.recommendedWithdrawalCount ?? 0),
      countedAt: existing?.countedAt ? String(existing.countedAt).slice(0, 10) : new Date().toISOString().slice(0, 10),
      notes: existing?.notes || '',
    });
    setQuranOpeningBaselineDialog(true);
  };

  const saveQuranOpeningBaseline = async () => {
    if (!quranOpeningBaselineSite) return;
    const keys = ['largeCount', 'mediumCount', 'smallCount', 'recommendedWithdrawalCount'] as const;
    const parsed = Object.fromEntries(keys.map((key) => [key, Number(quranOpeningBaselineForm[key] || 0)])) as Record<typeof keys[number], number>;
    if (keys.some((key) => !Number.isInteger(parsed[key]) || parsed[key] < 0)) return toast.error('أعداد الجرد التأسيسي يجب أن تكون أرقامًا صحيحة غير سالبة');
    const total = parsed.largeCount + parsed.mediumCount + parsed.smallCount;
    if (parsed.recommendedWithdrawalCount > total) return toast.error('عدد المصاحف الموصى بسحبها لا يمكن أن يتجاوز إجمالي الموجود في الموقع');
    setQuranStockSaving(true);
    try {
      const result = await mosqueApi.saveQuranOpeningBaseline({
        siteId: quranOpeningBaselineSite.id,
        ...parsed,
        countedAt: quranOpeningBaselineForm.countedAt || new Date().toISOString(),
        notes: quranOpeningBaselineForm.notes || null,
      });
      setQuranOpeningBaselineStatus(result.state);
      setQuranOpeningBaselineDialog(false);
      setQuranOpeningBaselineSite(null);
      toast.success(result.message || 'تم حفظ الجرد التأسيسي دون التأثير على رصيد مكتبة المصاحف');
      await loadAll();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'تعذر حفظ الجرد التأسيسي');
    } finally {
      setQuranStockSaving(false);
    }
  };

  const closeQuranOpeningBaseline = async () => {
    if (!quranOpeningBaselineStatus || quranOpeningBaselineStatus.closed) return;
    if (quranOpeningBaselineStatus.remainingSites > 0) {
      toast.error(`لا يمكن الإقفال قبل حصر جميع المواقع. المتبقي ${quranOpeningBaselineStatus.remainingSites} موقعًا`);
      return;
    }
    const phrase = 'اعتماد الجرد التأسيسي';
    const entered = window.prompt(`سيتم إقفال الأرصدة الافتتاحية نهائيًا. اكتب العبارة التالية للتأكيد:\n\n${phrase}`);
    if (entered === null) return;
    if (entered.trim() !== phrase) return toast.error('عبارة التأكيد غير مطابقة');
    if (!window.confirm('بعد الإقفال، أي إضافة جديدة للمساجد ستتم من مكتبة المصاحف وأي سحب سيتم كحركة مستقلة. هل تريد اعتماد الجرد التأسيسي؟')) return;
    setQuranStockSaving(true);
    try {
      const result = await mosqueApi.closeQuranOpeningBaseline(phrase);
      setQuranOpeningBaselineStatus(result.state);
      toast.success(result.message || 'تم اعتماد وإقفال الجرد التأسيسي');
      await loadAll();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'تعذر إقفال الجرد التأسيسي');
    } finally {
      setQuranStockSaving(false);
    }
  };

""" + function_anchor
if function_anchor not in page:
    raise SystemExit('Missing opening distribution function anchor')
page = page.replace(function_anchor, opening_functions, 1)

# ---------- Intro / progress card inside Quran management card ----------
content_anchor = """            <CardContent className=\"space-y-4 pt-5\">
              <div className=\"grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6\">"""
content_replacement = """            <CardContent className=\"space-y-4 pt-5\">
              {role === 'head' && quranOpeningBaselineStatus && <div className={`rounded-2xl border p-4 ${quranOpeningBaselineStatus.closed ? 'border-emerald-200 bg-emerald-50/70' : 'border-amber-200 bg-amber-50/70'}`}>
                <div className=\"flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between\">
                  <div>
                    <div className=\"flex flex-wrap items-center gap-2\"><p className=\"font-black text-slate-900\">الجرد التأسيسي للمصاحف</p><Badge className={quranOpeningBaselineStatus.closed ? 'bg-emerald-600' : 'bg-amber-500'}>{quranOpeningBaselineStatus.closed ? 'معتمد ومقفل' : 'مرحلة الحصر الميداني'}</Badge></div>
                    <p className=\"mt-1 text-xs leading-6 text-slate-600\">يسجل المصاحف الموجودة فعليًا في المساجد والمصليات قبل تشغيل النظام كنقطة بداية، ولا يخصم أي كمية من مكتبة المصاحف.</p>
                  </div>
                  <div className=\"flex flex-wrap items-center gap-2\"><Badge variant=\"outline\" className=\"bg-white px-3 py-2\">تم الحصر {quranOpeningBaselineStatus.countedSites} / {quranOpeningBaselineStatus.totalSites}</Badge>{!quranOpeningBaselineStatus.closed && <Button className={`${button3d} bg-emerald-700 hover:bg-emerald-600`} disabled={quranOpeningBaselineStatus.remainingSites > 0 || quranStockSaving} onClick={closeQuranOpeningBaseline}><CheckCircle2 className=\"ml-2 h-4 w-4\" />اعتماد وإقفال الجرد التأسيسي</Button>}</div>
                </div>
                {!quranOpeningBaselineStatus.closed && quranOpeningBaselineStatus.remainingSites > 0 && <div className=\"mt-3 rounded-xl border border-amber-200 bg-white/80 px-3 py-2 text-xs font-bold text-amber-800\">متبقي {quranOpeningBaselineStatus.remainingSites} موقعًا قبل إمكانية الاعتماد والإقفال.</div>}
                {quranOpeningBaselineStatus.closed && <div className=\"mt-3 text-xs text-emerald-800\">تم الإقفال {quranOpeningBaselineStatus.closedAt ? new Date(quranOpeningBaselineStatus.closedAt).toLocaleString('ar-SA-u-ca-gregory') : ''}{quranOpeningBaselineStatus.closedByName ? ` — بواسطة ${quranOpeningBaselineStatus.closedByName}` : ''}.</div>}
              </div>}
              <div className=\"grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6\">"""
if content_anchor not in page:
    raise SystemExit('Missing Quran management content anchor')
page = page.replace(content_anchor, content_replacement, 1)

# ---------- Row action ----------
old_action = """<td className=\"p-3\"><div className=\"flex justify-center gap-2\">{role === 'head' && <Button size=\"sm\" className={`${button3d} bg-sky-700 hover:bg-sky-600`} onClick={() => openQuranDistributionForSite(site)}><BookOpen className=\"ml-1 h-3.5 w-3.5\" />إضافة مصحف من المكتبة</Button>}{role === 'head' && <Button size=\"sm\" className={`${button3d} bg-amber-600 hover:bg-amber-500`} onClick={() => openQuranWithdrawalForSite(site)}><RefreshCw className=\"ml-1 h-3.5 w-3.5\" />سحب مصاحف</Button>}<Button size=\"sm\" variant=\"outline\" className={button3d} onClick={() => openQuranHistory(site)}><Clock3 className=\"ml-1 h-3.5 w-3.5\" />السجل</Button></div></td>"""
new_action = """<td className=\"p-3\"><div className=\"flex flex-wrap justify-center gap-2\">{role === 'head' && quranOpeningBaselineStatus && !quranOpeningBaselineStatus.closed && <Button size=\"sm\" className={`${button3d} bg-violet-700 hover:bg-violet-600`} onClick={() => openQuranOpeningBaselineForSite(site)}><ClipboardList className=\"ml-1 h-3.5 w-3.5\" />{quranOpeningBaselineStatus.items.find((row) => row.site.id === site.id)?.counted ? 'تحديث الجرد التأسيسي' : 'الجرد التأسيسي'}</Button>}{role === 'head' && <Button size=\"sm\" className={`${button3d} bg-sky-700 hover:bg-sky-600`} onClick={() => openQuranDistributionForSite(site)}><BookOpen className=\"ml-1 h-3.5 w-3.5\" />إضافة مصحف من المكتبة</Button>}{role === 'head' && <Button size=\"sm\" className={`${button3d} bg-amber-600 hover:bg-amber-500`} onClick={() => openQuranWithdrawalForSite(site)}><RefreshCw className=\"ml-1 h-3.5 w-3.5\" />سحب مصاحف</Button>}<Button size=\"sm\" variant=\"outline\" className={button3d} onClick={() => openQuranHistory(site)}><Clock3 className=\"ml-1 h-3.5 w-3.5\" />السجل</Button></div></td>"""
if old_action not in page:
    raise SystemExit('Missing Quran row action anchor')
page = page.replace(old_action, new_action, 1)

# ---------- Opening baseline dialog before stock movement dialog ----------
dialog_anchor = """      <Dialog open={quranStockMovementDialog} onOpenChange={setQuranStockMovementDialog}>
"""
opening_dialog = """      <Dialog open={quranOpeningBaselineDialog} onOpenChange={(open) => { setQuranOpeningBaselineDialog(open); if (!open) setQuranOpeningBaselineSite(null); }}>
        <DialogContent className=\"grid h-[90dvh] max-h-[90dvh] grid-rows-[auto_minmax(0,1fr)_auto] overflow-hidden p-0 gap-0 border-violet-200/80 bg-gradient-to-br from-white via-violet-50/25 to-emerald-50/20 sm:max-w-[900px]\" dir=\"rtl\">
          <DialogHeader className=\"border-b border-violet-100 bg-gradient-to-l from-violet-50 via-white to-emerald-50 p-5 text-right\"><DialogTitle className=\"flex items-center gap-2 text-xl font-black\"><ClipboardList className=\"h-5 w-5 text-violet-700\" />الجرد التأسيسي للمصاحف</DialogTitle><DialogDescription>{quranOpeningBaselineSite?.name || ''} — تسجيل الرصيد الموجود فعليًا قبل بدء العمل بالنظام. هذه العملية لا تخصم من مكتبة المصاحف.</DialogDescription></DialogHeader>
          <div className=\"min-h-0 space-y-5 overflow-y-auto p-5 md:p-6\">
            <div className=\"rounded-2xl border border-sky-200 bg-sky-50 p-4 text-sm leading-7 text-sky-900\"><strong>نقطة البداية:</strong> احصر المصاحف الموجودة ميدانيًا في هذا المسجد أو المصلى ثم أدخلها هنا. بعد إقفال الجرد التأسيسي، أي مصحف جديد يضاف للموقع يجب أن يأتي من «مكتبة المصاحف» ويخصم منها تلقائيًا.</div>
            <Card className=\"border-violet-200/70\"><CardHeader className=\"pb-3\"><CardTitle className=\"text-base\">الرصيد الافتتاحي حسب الحجم</CardTitle><CardDescription>أدخل العدد الفعلي الموجود وقت الزيارة الميدانية.</CardDescription></CardHeader><CardContent className=\"grid gap-4 md:grid-cols-3\"><Field label=\"المصاحف الكبيرة\"><Input type=\"number\" min=\"0\" step=\"1\" inputMode=\"numeric\" value={quranOpeningBaselineForm.largeCount} onChange={(e) => setQuranOpeningBaselineForm({ ...quranOpeningBaselineForm, largeCount: e.target.value })} /></Field><Field label=\"المصاحف المتوسطة\"><Input type=\"number\" min=\"0\" step=\"1\" inputMode=\"numeric\" value={quranOpeningBaselineForm.mediumCount} onChange={(e) => setQuranOpeningBaselineForm({ ...quranOpeningBaselineForm, mediumCount: e.target.value })} /></Field><Field label=\"المصاحف الصغيرة\"><Input type=\"number\" min=\"0\" step=\"1\" inputMode=\"numeric\" value={quranOpeningBaselineForm.smallCount} onChange={(e) => setQuranOpeningBaselineForm({ ...quranOpeningBaselineForm, smallCount: e.target.value })} /></Field></CardContent></Card>
            <div className=\"grid gap-4 md:grid-cols-2\"><Field label=\"مصاحف يوصى بسحبها\"><Input type=\"number\" min=\"0\" step=\"1\" inputMode=\"numeric\" value={quranOpeningBaselineForm.recommendedWithdrawalCount} onChange={(e) => setQuranOpeningBaselineForm({ ...quranOpeningBaselineForm, recommendedWithdrawalCount: e.target.value })} /><p className=\"mt-1 text-[11px] leading-5 text-muted-foreground\">توصية ميدانية فقط؛ لا تعتبر المصاحف مسحوبة حتى تنفيذ إجراء «سحب مصاحف» فعليًا.</p></Field><Field label=\"تاريخ الحصر الميداني\"><Input type=\"date\" value={quranOpeningBaselineForm.countedAt} onChange={(e) => setQuranOpeningBaselineForm({ ...quranOpeningBaselineForm, countedAt: e.target.value })} /></Field></div>
            <div className=\"grid grid-cols-2 gap-3 rounded-2xl border border-violet-200 bg-violet-50/60 p-4 sm:grid-cols-4\"><Info label=\"الإجمالي\" value={(Number(quranOpeningBaselineForm.largeCount || 0) + Number(quranOpeningBaselineForm.mediumCount || 0) + Number(quranOpeningBaselineForm.smallCount || 0)).toLocaleString('ar-SA')} /><Info label=\"الكبيرة\" value={Number(quranOpeningBaselineForm.largeCount || 0).toLocaleString('ar-SA')} /><Info label=\"المتوسطة\" value={Number(quranOpeningBaselineForm.mediumCount || 0).toLocaleString('ar-SA')} /><Info label=\"الصغيرة\" value={Number(quranOpeningBaselineForm.smallCount || 0).toLocaleString('ar-SA')} /></div>
            <Field label=\"ملاحظات الحصر\"><Textarea rows={4} value={quranOpeningBaselineForm.notes} onChange={(e) => setQuranOpeningBaselineForm({ ...quranOpeningBaselineForm, notes: e.target.value })} placeholder=\"مثال: بعض المصاحف قديمة ويوصى بسحبها، موقع المصاحف داخل المسجد، ملاحظات الزيارة...\" /></Field>
          </div>
          <DialogFooter className=\"relative z-20 shrink-0 border-t border-violet-100 bg-white p-4 shadow-[0_-12px_30px_rgba(15,23,42,0.08)] md:px-6\"><Button variant=\"outline\" className={button3d} onClick={() => setQuranOpeningBaselineDialog(false)}>إلغاء</Button><Button className={`${button3d} min-w-40 bg-violet-700 hover:bg-violet-600`} onClick={saveQuranOpeningBaseline} disabled={quranStockSaving}><Save className=\"ml-2 h-4 w-4\" />{quranStockSaving ? 'جاري الحفظ...' : 'حفظ الرصيد الافتتاحي'}</Button></DialogFooter>
        </DialogContent>
      </Dialog>

""" + dialog_anchor
if dialog_anchor not in page:
    raise SystemExit('Missing Quran stock movement dialog anchor')
page = page.replace(dialog_anchor, opening_dialog, 1)

# Clarify the table note with the initial-inventory exception while campaign is open.
note_old = """<div className=\"rounded-xl border border-emerald-200 bg-emerald-50/60 px-4 py-3 text-xs leading-6 text-emerald-900\">ملاحظة: <strong>إضافة المصاحف للمسجد أو المصلى تتم من زر «إضافة مصحف من المكتبة» فقط.</strong> عند الإضافة تخصم الكمية تلقائيًا من رصيد مكتبة المصاحف وتضاف إلى رصيد الموقع مع حفظ الحركة.</div>"""
note_new = """<div className=\"rounded-xl border border-emerald-200 bg-emerald-50/60 px-4 py-3 text-xs leading-6 text-emerald-900\">ملاحظة: خلال مرحلة البداية يستخدم «الجرد التأسيسي» لتسجيل المصاحف الموجودة أصلًا دون الخصم من المكتبة. <strong>بعد اعتماد وإقفال الجرد التأسيسي، إضافة أي مصحف جديد للمسجد أو المصلى تتم من زر «إضافة مصحف من المكتبة» فقط</strong> ليتم الخصم التلقائي وحفظ الحركة.</div>"""
if note_old not in page:
    raise SystemExit('Missing Quran table note anchor')
page = page.replace(note_old, note_new, 1)

if api == api_original:
    raise SystemExit('No API changes applied')
if page == page_original:
    raise SystemExit('No page changes applied')

api_path.write_text(api, encoding='utf-8')
page_path.write_text(page, encoding='utf-8')
print('Quran opening baseline frontend added')
