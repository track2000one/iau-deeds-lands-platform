import fs from 'node:fs';

const path = 'src/app/pages/MosquesUnitPage.tsx';
let source = fs.readFileSync(path, 'utf8');

const replaceOnce = (from, to, label) => {
  const count = source.split(from).length - 1;
  if (count !== 1) throw new Error(`${label}: expected exactly 1 match, found ${count}`);
  source = source.replace(from, to);
};

replaceOnce(
  "  const [quranStockMovementDialog, setQuranStockMovementDialog] = useState(false);\n  const [quranStockMovementForm, setQuranStockMovementForm] = useState<any>(emptyQuranStockMovementForm());\n  const [quranStockSaving, setQuranStockSaving] = useState(false);",
  "  const [quranStockMovementDialog, setQuranStockMovementDialog] = useState(false);\n  const [quranStockMovementForm, setQuranStockMovementForm] = useState<any>(emptyQuranStockMovementForm());\n  const [quranStockContextSiteId, setQuranStockContextSiteId] = useState<string | null>(null);\n  const [quranStockSaving, setQuranStockSaving] = useState(false);",
  'add contextual site state',
);

replaceOnce(
  "  const openQuranStockMovement = (movementType: string) => {\n    const activeWarehouse = quranStockDashboard?.warehouses.find((item) => item.active) || quranStockDashboard?.warehouses[0];\n    setQuranStockMovementForm({",
  "  const openQuranStockMovement = (movementType: string) => {\n    const activeWarehouse = quranStockDashboard?.warehouses.find((item) => item.active) || quranStockDashboard?.warehouses[0];\n    setQuranStockContextSiteId(null);\n    setQuranStockMovementForm({",
  'clear site lock for generic movement',
);

replaceOnce(
  "    setQuranStockMovementForm({\n      ...emptyQuranStockMovementForm(),\n      movementType: 'distribution',\n      warehouseId: activeWarehouse.id,\n      siteId: site.id,\n      referenceNumber: linkedRequest?.requestNumber || '',",
  "    setQuranStockContextSiteId(site.id);\n    setQuranStockMovementForm({\n      ...emptyQuranStockMovementForm(),\n      movementType: 'distribution',\n      warehouseId: activeWarehouse.id,\n      siteId: site.id,\n      referenceNumber: linkedRequest?.requestNumber || '',",
  'lock distribution to selected site',
);

replaceOnce(
  "    setQuranStockMovementForm({\n      ...emptyQuranStockMovementForm(),\n      movementType: 'site_withdrawal',\n      warehouseId: activeWarehouse.id,\n      siteId: site.id,\n    });\n    setQuranStockMovementDialog(true);",
  "    setQuranStockContextSiteId(site.id);\n    setQuranStockMovementForm({\n      ...emptyQuranStockMovementForm(),\n      movementType: 'site_withdrawal',\n      warehouseId: activeWarehouse.id,\n      siteId: site.id,\n    });\n    setQuranStockMovementDialog(true);",
  'lock withdrawal to selected site',
);

replaceOnce(
  "      <Dialog open={quranStockMovementDialog} onOpenChange={setQuranStockMovementDialog}>",
  "      <Dialog open={quranStockMovementDialog} onOpenChange={(open) => { setQuranStockMovementDialog(open); if (!open) setQuranStockContextSiteId(null); }}>",
  'clear contextual site on close',
);

const oldControls = `            <div className=\"grid gap-4 md:grid-cols-2\"><Field label=\"نوع الحركة *\"><NativeSelect value={quranStockMovementForm.movementType} onChange={(e) => setQuranStockMovementForm({ ...quranStockMovementForm, movementType: e.target.value, siteId: ['distribution', 'return', 'site_withdrawal'].includes(e.target.value) ? (quranStockMovementForm.siteId || sites[0]?.id || '') : '' })}>{Object.entries(quranStockMovementTypeLabels).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</NativeSelect></Field><Field label=\"المكتبة *\"><NativeSelect value={quranStockMovementForm.warehouseId} onChange={(e) => setQuranStockMovementForm({ ...quranStockMovementForm, warehouseId: e.target.value })}><option value=\"\">اختر المكتبة</option>{quranStockDashboard?.warehouses.map((warehouse) => <option key={warehouse.id} value={warehouse.id}>{warehouse.name} — رصيد {warehouse.balance.totalCount}</option>)}</NativeSelect></Field>{['distribution', 'return', 'site_withdrawal'].includes(quranStockMovementForm.movementType) && <div className=\"md:col-span-2\"><Field label=\"المسجد / المصلى *\"><NativeSelect value={quranStockMovementForm.siteId} onChange={(e) => setQuranStockMovementForm({ ...quranStockMovementForm, siteId: e.target.value })}><option value=\"\">اختر الموقع</option>{sites.map((site) => <option key={site.id} value={site.id}>{site.name} — {siteTypeDisplayLabel(site)}</option>)}</NativeSelect></Field></div>}</div>`;

const newControls = `            <div className=\"grid gap-4 md:grid-cols-2\"><Field label=\"نوع الحركة *\"><NativeSelect disabled={Boolean(quranStockContextSiteId)} value={quranStockMovementForm.movementType} onChange={(e) => setQuranStockMovementForm({ ...quranStockMovementForm, movementType: e.target.value, siteId: ['distribution', 'return', 'site_withdrawal'].includes(e.target.value) ? (quranStockMovementForm.siteId || sites[0]?.id || '') : '' })}>{Object.entries(quranStockMovementTypeLabels).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</NativeSelect>{quranStockContextSiteId && <p className=\"mt-1.5 text-[11px] text-slate-500\">تم تحديد نوع الحركة تلقائيًا من الإجراء الذي اخترته.</p>}</Field><Field label=\"المكتبة *\"><NativeSelect value={quranStockMovementForm.warehouseId} onChange={(e) => setQuranStockMovementForm({ ...quranStockMovementForm, warehouseId: e.target.value })}><option value=\"\">اختر المكتبة</option>{quranStockDashboard?.warehouses.map((warehouse) => <option key={warehouse.id} value={warehouse.id}>{warehouse.name} — رصيد {warehouse.balance.totalCount}</option>)}</NativeSelect></Field>{['distribution', 'return', 'site_withdrawal'].includes(quranStockMovementForm.movementType) && <div className=\"md:col-span-2\">{quranStockContextSiteId ? (() => { const selectedSite = sites.find((site) => site.id === quranStockMovementForm.siteId); return <Field label=\"المسجد / المصلى المستهدف\"><div className=\"rounded-xl border border-emerald-200 bg-emerald-50/70 px-4 py-3\"><div className=\"flex flex-wrap items-center justify-between gap-2\"><div><p className=\"font-black text-emerald-950\">{selectedSite?.name || 'الموقع المحدد'}</p><p className=\"mt-1 text-xs text-emerald-800\">{selectedSite ? siteTypeDisplayLabel(selectedSite) : 'مسجد / مصلى'} — تم تحديده تلقائيًا من البطاقة</p></div><Badge variant=\"outline\" className=\"border-emerald-300 bg-white text-emerald-800\">محدد مسبقًا</Badge></div></div></Field>; })() : <Field label=\"المسجد / المصلى *\"><NativeSelect value={quranStockMovementForm.siteId} onChange={(e) => setQuranStockMovementForm({ ...quranStockMovementForm, siteId: e.target.value })}><option value=\"\">اختر الموقع</option>{sites.map((site) => <option key={site.id} value={site.id}>{site.name} — {siteTypeDisplayLabel(site)}</option>)}</NativeSelect></Field>}</div>}</div>`;

replaceOnce(oldControls, newControls, 'replace site dropdown with contextual site card');

fs.writeFileSync(path, source);
console.log('Applied Quran contextual site locking UX.');
