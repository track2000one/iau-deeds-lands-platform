from pathlib import Path

# routes.tsx
p = Path('src/app/routes.tsx')
s = p.read_text()
marker = "const AccountingTransformationReportsPage = lazy(() => import('./pages/AccountingTransformationReportsPage').then((m) => ({ default: m.AccountingTransformationReportsPage })));"
insert = marker + "\nconst AccountingTransformationCyclesPage = lazy(() => import('./pages/AccountingTransformationCyclesPage').then((m) => ({ default: m.AccountingTransformationCyclesPage })));"
if 'AccountingTransformationCyclesPage' not in s:
    if marker not in s:
        raise SystemExit('routes lazy marker not found')
    s = s.replace(marker, insert)
route_marker = "          { path: 'reports', element: accountingTransformationPermission(<AccountingTransformationReportsPage />, 'canView') },\n"
if "path: 'cycles'" not in s:
    if route_marker not in s:
        raise SystemExit('routes child marker not found')
    s = s.replace(route_marker, route_marker + "          { path: 'cycles', element: accountingTransformationPermission(<AccountingTransformationCyclesPage />, 'canView') },\n")
p.write_text(s)

# Dashboard
p = Path('src/app/pages/AccountingTransformationDashboardPage.tsx')
s = p.read_text()
s = s.replace('  LandPlot,\n  ListChecks,', '  LandPlot,\n  ListChecks,\n  History,\n  RefreshCcw,')
s = s.replace(
    "import { getAccountingTransformationStats } from '../api/accountingTransformation';",
    "import { getAccountingTransformationCycles, getAccountingTransformationStats } from '../api/accountingTransformation';"
)
s = s.replace(
    "import type { AccountingTransformationStats } from '../../types/accountingTransformation';",
    "import type { AccountingTransformationCycle, AccountingTransformationStats } from '../../types/accountingTransformation';"
)
old_actions = """const quickActions = [
  { label: 'جميع السجلات', description: 'استعراض الأراضي والمباني والبحث في متطلبات التحول.', path: '/accounting-transformation/records', icon: FileSearch },
  { label: 'إضافة سجل جديد', description: 'إدخال سجل أرض أو مبنى وفق حقول النموذج المعتمد.', path: '/accounting-transformation/new', icon: PlusCircle },
  { label: 'استيراد Excel', description: 'استيراد ملف التحول المحاسبي المعتمد مباشرة مع تحليل الحقول.', path: '/accounting-transformation/import', icon: FileSpreadsheet },
  { label: 'التقارير', description: 'تقارير الحصر والجرد والتقييم مع Excel والطباعة.', path: '/accounting-transformation/reports', icon: BarChart3 },
] as const;"""
new_actions = """const quickActions = [
  { label: 'جميع السجلات', description: 'استعراض الأراضي والمباني والبحث في متطلبات التحول.', path: '/accounting-transformation/records', icon: FileSearch },
  { label: 'دورات تحديث البيانات', description: 'إنشاء إصدار جديد، المقارنة مع السابق، الاعتماد والأرشفة دون حذف التاريخ.', path: '/accounting-transformation/cycles', icon: History },
  { label: 'إضافة سجل جديد', description: 'إدخال سجل أرض أو مبنى وفق حقول النموذج المعتمد.', path: '/accounting-transformation/new', icon: PlusCircle },
  { label: 'استيراد Excel', description: 'استيراد النموذج داخل دورة تحديث مستقلة قبل اعتمادها.', path: '/accounting-transformation/import', icon: FileSpreadsheet },
  { label: 'التقارير', description: 'تقارير الحصر والجرد والتقييم مع Excel والطباعة.', path: '/accounting-transformation/reports', icon: BarChart3 },
] as const;"""
if old_actions in s:
    s = s.replace(old_actions, new_actions)

state_marker = "  const [stats, setStats] = useState<AccountingTransformationStats>(EMPTY);\n  const [loading, setLoading] = useState(true);"
if state_marker not in s:
    raise SystemExit('dashboard state marker not found')
s = s.replace(state_marker, state_marker + "\n  const [cycles, setCycles] = useState<AccountingTransformationCycle[]>([]);")

old_effect = """  useEffect(() => {
    let active = true;
    getAccountingTransformationStats()
      .then((data) => active && setStats(data || EMPTY))
      .catch(() => active && setStats(EMPTY))
      .finally(() => active && setLoading(false));
    return () => { active = false; };
  }, []);"""
new_effect = """  useEffect(() => {
    let active = true;
    Promise.all([getAccountingTransformationStats(), getAccountingTransformationCycles()])
      .then(([data, cycleData]) => {
        if (!active) return;
        setStats(data || EMPTY);
        setCycles(cycleData || []);
      })
      .catch(() => {
        if (!active) return;
        setStats(EMPTY);
        setCycles([]);
      })
      .finally(() => active && setLoading(false));
    return () => { active = false; };
  }, []);

  const currentCycle = cycles.find((cycle) => cycle.isCurrent);
  const openCycle = cycles.find((cycle) => ['draft', 'under_review'].includes(cycle.status));"""
if old_effect not in s:
    raise SystemExit('dashboard effect marker not found')
s = s.replace(old_effect, new_effect)

hero_end = """          </section>

          <section className=\"grid gap-5 xl:grid-cols-[.85fr_1.55fr]\">"""
cycle_banner = """          </section>

          {(currentCycle || openCycle) && <section className=\"grid gap-3 rounded-[24px] border border-white/15 bg-white/[.07] p-4 backdrop-blur md:grid-cols-[1fr_auto] md:items-center\">
            <div>
              <p className=\"text-xs font-bold text-cyan-100\">{openCycle ? 'توجد دورة تحديث قيد العمل' : 'الدورة الحالية المعتمدة'}</p>
              <p className=\"mt-1 font-black text-white\">{openCycle ? `#${openCycle.cycleNumber} — ${openCycle.name}` : currentCycle ? `#${currentCycle.cycleNumber} — ${currentCycle.name}` : ''}</p>
              <p className=\"mt-1 text-xs text-slate-300\">{openCycle ? `${openCycle.recordCount.toLocaleString('ar-SA')} سجل · ${openCycle.status === 'under_review' ? 'تحت المراجعة' : 'مسودة'}` : `${currentCycle?.recordCount.toLocaleString('ar-SA') || 0} سجل محفوظ في الإصدار الحالي`}</p>
            </div>
            <Button variant=\"outline\" className=\"border-white/15 bg-white/10 text-white hover:bg-white/15 hover:text-white\" onClick={() => navigate(openCycle ? `/accounting-transformation/import?cycle=${encodeURIComponent(openCycle.id)}` : '/accounting-transformation/cycles')}><RefreshCcw className=\"ml-2 h-4 w-4\" />{openCycle ? 'فتح دورة التحديث' : 'سجل الدورات'}</Button>
          </section>}

          <section className=\"grid gap-5 xl:grid-cols-[.85fr_1.55fr]\">"""
if hero_end not in s:
    raise SystemExit('dashboard hero marker not found')
s = s.replace(hero_end, cycle_banner, 1)
p.write_text(s)

# Import page
p = Path('src/app/pages/AccountingTransformationImportPage.tsx')
s = p.read_text()
s = s.replace("import React, { useMemo, useState } from 'react';", "import React, { useEffect, useMemo, useState } from 'react';")
s = s.replace("import { useNavigate } from 'react-router';", "import { useNavigate, useSearchParams } from 'react-router';")
s = s.replace(
    "  bulkImportAccountingTransformationRecords,\n  previewAccountingTransformationImport,",
    "  getAccountingTransformationCycles,\n  importAccountingTransformationCycleRecords,\n  previewAccountingTransformationCycleImport,"
)
s = s.replace(
    "import type { AccountingTransformationInput } from '../../types/accountingTransformation';",
    "import type { AccountingTransformationCycle, AccountingTransformationInput } from '../../types/accountingTransformation';"
)
s = s.replace(
    "type ImportResult = { created: number; updated: number; skipped: number; total: number };",
    "type ImportResult = { created: number; updated: number; skipped: number; total: number; new?: number; modified?: number; unchanged?: number };"
)
s = s.replace("  const navigate = useNavigate();", "  const navigate = useNavigate();\n  const [searchParams] = useSearchParams();", 1)
s = s.replace("  const [limitPerBatch, setLimitPerBatch] = useState<number>(25);", "  const [limitPerBatch, setLimitPerBatch] = useState<number>(0);")
state_anchor = "  const [message, setMessage] = useState('');\n"
if state_anchor not in s:
    raise SystemExit('import state anchor missing')
s = s.replace(state_anchor, state_anchor + "  const [cycles, setCycles] = useState<AccountingTransformationCycle[]>([]);\n  const [selectedCycleId, setSelectedCycleId] = useState(searchParams.get('cycle') || '');\n  const [cyclesLoading, setCyclesLoading] = useState(true);\n\n  useEffect(() => {\n    let active = true;\n    getAccountingTransformationCycles()\n      .then((data) => {\n        if (!active) return;\n        const open = (data || []).filter((cycle) => ['draft', 'under_review'].includes(cycle.status));\n        setCycles(open);\n        const requested = searchParams.get('cycle');\n        const selected = open.find((cycle) => cycle.id === requested) || open[0];\n        setSelectedCycleId(selected?.id || '');\n      })\n      .catch((error) => toast.error(error instanceof Error ? error.message : 'تعذر تحميل دورة التحديث'))\n      .finally(() => active && setCyclesLoading(false));\n    return () => { active = false; };\n  }, []);\n\n  const selectedCycle = cycles.find((cycle) => cycle.id === selectedCycleId);\n")

old_scan = """      const preview = await previewAccountingTransformationImport(allItems.map(stripSource));
      setScan(preview);
      if (preview.fresh === 0 && preview.duplicate > 0) {
        setMessage(`تم فحص الملف: جميع السجلات الصالحة مكررة أو سبق استيرادها. لن تتم إضافة سجلات جديدة.`);
      } else {
        setMessage(`اكتمل الفحص: ${preview.fresh.toLocaleString('ar-SA')} سجل جديد، ${preview.duplicate.toLocaleString('ar-SA')} مكرر/سبق استيراده${preview.invalid ? `، و${preview.invalid.toLocaleString('ar-SA')} غير صالح` : ''}.`);
      }"""
new_scan = """      if (!selectedCycleId) throw new Error('أنشئ دورة تحديث جديدة أولًا من صفحة دورات البيانات.');
      const preview = await previewAccountingTransformationCycleImport(selectedCycleId, allItems.map(stripSource), fileName || undefined);
      setScan(preview);
      setMessage(`نتيجة المقارنة مع الدورة السابقة: ${(preview.new || 0).toLocaleString('ar-SA')} جديد، ${(preview.modified || 0).toLocaleString('ar-SA')} معدل، ${(preview.unchanged || 0).toLocaleString('ar-SA')} بدون تغيير، ${(preview.removed || 0).toLocaleString('ar-SA')} لم يظهر في الملف الجديد${preview.duplicate ? `، و${preview.duplicate.toLocaleString('ar-SA')} سبق إدخاله في هذه الدورة` : ''}.`);"""
if old_scan not in s:
    raise SystemExit('import refresh scan marker missing')
s = s.replace(old_scan, new_scan)

s = s.replace("    if (!file) return;\n    if (!/\\.(xlsx|xls)$/i.test(file.name))", "    if (!file) return;\n    if (!selectedCycleId) return toast.error('أنشئ أو اختر دورة تحديث مسودة قبل رفع الملف');\n    if (!/\\.(xlsx|xls)$/i.test(file.name))")
s = s.replace("      setFileName(file.name);\n      setMessage(`تم تحليل الملف", "      setFileName(file.name);\n      setMessage(`تم تحليل الملف")

old_import = """      const response = await bulkImportAccountingTransformationRecords(currentFreshRows.map(stripSource));
      setResult(response);
      toast.success(`اكتملت ${batchLabel}: ${response.created.toLocaleString('ar-SA')} سجل جديد`);
      await refreshScan(items);"""
new_import = """      if (!selectedCycleId) throw new Error('لم يتم تحديد دورة التحديث');
      const response = await importAccountingTransformationCycleRecords(selectedCycleId, currentFreshRows.map(stripSource), fileName || undefined);
      setResult(response);
      toast.success(`اكتملت ${batchLabel}: ${response.created.toLocaleString('ar-SA')} سجل أضيف إلى الإصدار الجديد`);
      await refreshScan(items);"""
if old_import not in s:
    raise SystemExit('import action marker missing')
s = s.replace(old_import, new_import)

old_status = """  const statusForIndex = (index: number) => {
    if (duplicateIndexSet.has(index)) return { label: 'مكرر', className: 'border-amber-300 bg-amber-50 text-amber-800' };
    if (invalidIndexSet.has(index)) return { label: 'غير صالح', className: 'border-red-300 bg-red-50 text-red-700' };
    return { label: 'جديد', className: 'border-emerald-300 bg-emerald-50 text-emerald-700' };
  };"""
new_status = """  const newIndexSet = useMemo(() => new Set(scan?.newIndexes || []), [scan]);
  const modifiedIndexSet = useMemo(() => new Set(scan?.modifiedIndexes || []), [scan]);
  const unchangedIndexSet = useMemo(() => new Set(scan?.unchangedIndexes || []), [scan]);

  const statusForIndex = (index: number) => {
    if (duplicateIndexSet.has(index)) return { label: 'مدخل بالدورة', className: 'border-amber-300 bg-amber-50 text-amber-800' };
    if (invalidIndexSet.has(index)) return { label: 'غير صالح', className: 'border-red-300 bg-red-50 text-red-700' };
    if (modifiedIndexSet.has(index)) return { label: 'معدل', className: 'border-sky-300 bg-sky-50 text-sky-800' };
    if (unchangedIndexSet.has(index)) return { label: 'بدون تغيير', className: 'border-slate-300 bg-slate-50 text-slate-700' };
    if (newIndexSet.has(index)) return { label: 'جديد', className: 'border-emerald-300 bg-emerald-50 text-emerald-700' };
    return { label: 'جاهز', className: 'border-emerald-300 bg-emerald-50 text-emerald-700' };
  };"""
if old_status not in s:
    raise SystemExit('status marker missing')
s = s.replace(old_status, new_status)

header_old = """        <div><Badge variant=\"outline\" className=\"mb-2\">لجنة متابعة متطلبات التحول المحاسبي</Badge><h1 className=\"text-2xl font-black text-slate-900 md:text-3xl\">استيراد نموذج Excel</h1><p className=\"mt-1 text-sm text-slate-500\">فحص مسبق للتكرار، معاينة السجلات، ثم الاستيراد على دفعات بنفس أسلوب وحدة الأصول.</p></div>
        <Button variant=\"outline\" className=\"rounded-2xl\" onClick={() => navigate('/accounting-transformation')}><ArrowRight className=\"ml-2 h-4 w-4\" />العودة للوحة اللجنة</Button>"""
header_new = """        <div><Badge variant=\"outline\" className=\"mb-2\">لجنة متابعة متطلبات التحول المحاسبي</Badge><h1 className=\"text-2xl font-black text-slate-900 md:text-3xl\">استيراد دورة تحديث جديدة</h1><p className=\"mt-1 text-sm text-slate-500\">الملف الجديد لا يستبدل البيانات القديمة؛ يُحفظ في دورة مستقلة ويُقارن بالإصدار السابق قبل الاعتماد.</p></div>
        <div className=\"flex flex-wrap gap-2\"><Button variant=\"outline\" className=\"rounded-2xl\" onClick={() => navigate('/accounting-transformation/cycles')}>دورات البيانات</Button><Button variant=\"outline\" className=\"rounded-2xl\" onClick={() => navigate('/accounting-transformation')}><ArrowRight className=\"ml-2 h-4 w-4\" />العودة للوحة اللجنة</Button></div>"""
if header_old not in s:
    raise SystemExit('import header marker missing')
s = s.replace(header_old, header_new)

card_anchor = """      <Card className=\"rounded-[28px] border-dashed border-sky-300"""
cycle_selector = """      <Card className=\"rounded-[24px] border-cyan-200 bg-cyan-50/50\"><CardContent className=\"grid gap-3 p-4 md:grid-cols-[1fr_auto] md:items-end\"><label className=\"text-xs font-bold text-slate-600\">دورة التحديث المستهدفة<NativeSelect value={selectedCycleId} disabled={cyclesLoading || !cycles.length} onChange={(e) => { setSelectedCycleId(e.target.value); setItems([]); setScan(null); setResult(null); setFileName(''); setMessage(''); }} className=\"mt-1 h-11 rounded-xl bg-white\">{cycles.length ? cycles.map((cycle) => <option key={cycle.id} value={cycle.id}>#{cycle.cycleNumber} — {cycle.name} ({cycle.status === 'under_review' ? 'تحت المراجعة' : 'مسودة'})</option>) : <option value=\"\">لا توجد دورة مفتوحة</option>}</NativeSelect></label><Button variant=\"outline\" onClick={() => navigate('/accounting-transformation/cycles')}><PlusCircle className=\"ml-2 h-4 w-4\" />{cycles.length ? 'إدارة الدورات' : 'إنشاء دورة جديدة'}</Button>{selectedCycle && <p className=\"md:col-span-2 text-xs text-slate-600\">سيتم حفظ البيانات في: <strong>#{selectedCycle.cycleNumber} — {selectedCycle.name}</strong>. لن تصبح هذه البيانات رسمية حتى اعتماد الدورة.</p>}</CardContent></Card>

      <Card className=\"rounded-[28px] border-dashed border-sky-300"""
if card_anchor not in s:
    raise SystemExit('import card anchor missing')
s = s.replace(card_anchor, cycle_selector, 1)
s = s.replace("className=\"hidden\" disabled={parsing || importing}", "className=\"hidden\" disabled={parsing || importing || !selectedCycleId}")

metrics_old = """        <div className=\"grid gap-3 md:grid-cols-4\">
          <div className=\"rounded-[22px] border bg-white p-4 shadow-[0_7px_0_rgba(15,57,95,.05)]\"><p className=\"text-xs text-slate-500\">إجمالي سجلات الملف</p><p className=\"mt-1 text-3xl font-black text-slate-900\">{items.length.toLocaleString('ar-SA')}</p></div>
          <div className=\"rounded-[22px] border border-emerald-200 bg-emerald-50/60 p-4 shadow-[0_7px_0_rgba(16,185,129,.06)]\"><p className=\"text-xs text-emerald-700\">سجلات جديدة</p><p className=\"mt-1 text-3xl font-black text-emerald-900\">{(scan?.fresh || 0).toLocaleString('ar-SA')}</p></div>
          <div className=\"rounded-[22px] border border-amber-200 bg-amber-50/60 p-4 shadow-[0_7px_0_rgba(245,158,11,.06)]\"><p className=\"text-xs text-amber-700\">مكرر / سبق استيراده</p><p className=\"mt-1 text-3xl font-black text-amber-900\">{(scan?.duplicate || 0).toLocaleString('ar-SA')}</p></div>
          <div className=\"rounded-[22px] border bg-white p-4\"><div className=\"flex items-center justify-between gap-2\"><div><p className=\"text-xs text-slate-500\">الأراضي / المباني</p><p className=\"mt-1 text-xl font-black text-slate-900\">{lands.length.toLocaleString('ar-SA')} / {buildings.length.toLocaleString('ar-SA')}</p></div><div className=\"flex gap-1\"><LandPlot className=\"h-5 w-5 text-amber-700\" /><Building2 className=\"h-5 w-5 text-blue-700\" /></div></div></div>
        </div>"""
metrics_new = """        <div className=\"grid gap-3 md:grid-cols-2 xl:grid-cols-5\">
          <div className=\"rounded-[22px] border bg-white p-4\"><p className=\"text-xs text-slate-500\">إجمالي الملف</p><p className=\"mt-1 text-3xl font-black text-slate-900\">{items.length.toLocaleString('ar-SA')}</p><p className=\"mt-1 text-[11px] text-slate-500\">أراضٍ {lands.length.toLocaleString('ar-SA')} · مبانٍ {buildings.length.toLocaleString('ar-SA')}</p></div>
          <div className=\"rounded-[22px] border border-emerald-200 bg-emerald-50/60 p-4\"><p className=\"text-xs text-emerald-700\">جديد</p><p className=\"mt-1 text-3xl font-black text-emerald-900\">{(scan?.new || 0).toLocaleString('ar-SA')}</p></div>
          <div className=\"rounded-[22px] border border-sky-200 bg-sky-50/60 p-4\"><p className=\"text-xs text-sky-700\">تم تعديله</p><p className=\"mt-1 text-3xl font-black text-sky-900\">{(scan?.modified || 0).toLocaleString('ar-SA')}</p></div>
          <div className=\"rounded-[22px] border bg-slate-50 p-4\"><p className=\"text-xs text-slate-600\">بدون تغيير</p><p className=\"mt-1 text-3xl font-black text-slate-900\">{(scan?.unchanged || 0).toLocaleString('ar-SA')}</p></div>
          <div className=\"rounded-[22px] border border-amber-200 bg-amber-50/60 p-4\"><p className=\"text-xs text-amber-700\">لم يظهر بالتحديث الجديد</p><p className=\"mt-1 text-3xl font-black text-amber-900\">{(scan?.removed || 0).toLocaleString('ar-SA')}</p></div>
        </div>"""
if metrics_old not in s:
    raise SystemExit('import metrics marker missing')
s = s.replace(metrics_old, metrics_new)

s = s.replace("<p className=\"mt-1 text-sm font-black text-slate-900\">{currentFreshRows.length.toLocaleString('ar-SA')} جديد من", "<p className=\"mt-1 text-sm font-black text-slate-900\">{currentFreshRows.length.toLocaleString('ar-SA')} جاهز للإدخال من")
s = s.replace("{currentFreshRows.length ? 'جاهز للاستيراد' : 'لا توجد سجلات جديدة في هذه الدفعة'}", "{currentFreshRows.length ? 'جاهز للحفظ داخل دورة التحديث' : 'لا توجد سجلات متبقية في هذه الدفعة'}")
s = s.replace("لن تُنشأ السجلات المكررة مرة أخرى. بعد كل دفعة سيعاد فحص الملف تلقائيًا لتحديث الأعداد.", "كل سجل يُحفظ كنسخة داخل الدورة الجديدة مع تصنيفه: جديد أو معدل أو بدون تغيير. الإصدار السابق يبقى محفوظًا.")
s = s.replace("onClick={() => navigate('/accounting-transformation/records')}>عرض السجلات", "onClick={() => navigate(selectedCycleId ? `/accounting-transformation/records?cycle=${encodeURIComponent(selectedCycleId)}` : '/accounting-transformation/records')}>عرض سجلات الدورة")
p.write_text(s)

# Records page: historical cycle selection and read-only archived snapshots.
p = Path('src/app/pages/AccountingTransformationRecordsPage.tsx')
s = p.read_text()
s = s.replace(
    "  getAccountingTransformationGroups,\n  getAccountingTransformationRecords,\n  getAccountingTransformationStats,",
    "  getAccountingTransformationCycles,\n  getAccountingTransformationGroups,\n  getAccountingTransformationRecords,\n  getAccountingTransformationStats,"
)
s = s.replace(
    "  AccountingTransformationRecord,\n  AccountingTransformationStats,",
    "  AccountingTransformationCycle,\n  AccountingTransformationRecord,\n  AccountingTransformationStats,"
)
state = "  const [committeeStatus, setCommitteeStatus] = useState(params.get('status') || 'all');\n"
if state not in s:
    raise SystemExit('records state marker missing')
s = s.replace(state, state + "  const cycleId = params.get('cycle') || '';\n  const [selectedCycle, setSelectedCycle] = useState<AccountingTransformationCycle | null>(null);\n")
s = s.replace(
    "  const commonFilters = useMemo(() => ({ search: appliedSearch, recordType, committeeStatus }), [appliedSearch, recordType, committeeStatus]);",
    "  const commonFilters = useMemo(() => ({ search: appliedSearch, recordType, committeeStatus, cycleId: cycleId || undefined }), [appliedSearch, recordType, committeeStatus, cycleId]);\n  const isArchivedCycle = selectedCycle?.status === 'archived';\n  const effectiveCanEdit = canEdit && !isArchivedCycle;\n  const effectiveCanDelete = canDelete && !isArchivedCycle;"
)
old_overview = """      const [groupData, statData] = await Promise.all([
        getAccountingTransformationGroups(commonFilters),
        getAccountingTransformationStats(),
      ]);
      setGroups(groupData || []);
      setStats(statData || EMPTY_STATS);"""
new_overview = """      const [groupData, statData, cycleData] = await Promise.all([
        getAccountingTransformationGroups(commonFilters),
        getAccountingTransformationStats(cycleId || undefined),
        cycleId ? getAccountingTransformationCycles() : Promise.resolve([]),
      ]);
      setGroups(groupData || []);
      setStats(statData || EMPTY_STATS);
      setSelectedCycle(cycleId ? (cycleData.find((cycle) => cycle.id === cycleId) || null) : null);"""
if old_overview not in s:
    raise SystemExit('records overview marker missing')
s = s.replace(old_overview, new_overview)
s = s.replace("  useEffect(() => { loadOverview(); }, [appliedSearch, recordType, committeeStatus]);", "  useEffect(() => { loadOverview(); }, [appliedSearch, recordType, committeeStatus, cycleId]);")
s = s.replace("    if (committeeStatus !== 'all') next.set('status', committeeStatus);\n    setParams(next);", "    if (committeeStatus !== 'all') next.set('status', committeeStatus);\n    if (cycleId) next.set('cycle', cycleId);\n    setParams(next);")
header_anchor = """      </section>

      <div className=\"grid gap-3 md:grid-cols-3\">"""
cycle_notice = """      </section>

      {selectedCycle && <div className={`rounded-[22px] border p-4 ${selectedCycle.status === 'archived' ? 'border-slate-300 bg-slate-50' : selectedCycle.isCurrent ? 'border-emerald-200 bg-emerald-50/60' : 'border-sky-200 bg-sky-50/60'}`}><div className=\"flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between\"><div><p className=\"text-xs font-bold text-slate-500\">عرض إصدار محدد من البيانات</p><p className=\"mt-1 font-black text-slate-900\">#{selectedCycle.cycleNumber} — {selectedCycle.name}</p><p className=\"mt-1 text-xs text-slate-600\">{selectedCycle.status === 'archived' ? 'نسخة تاريخية مؤرشفة — العرض فقط دون تعديل أو حذف.' : selectedCycle.isCurrent ? 'الدورة الحالية المعتمدة.' : 'دورة قيد العمل قبل الاعتماد.'}</p></div><Button variant=\"outline\" onClick={() => navigate('/accounting-transformation/cycles')}>سجل الدورات</Button></div></div>}

      <div className=\"grid gap-3 md:grid-cols-3\">"""
if header_anchor not in s:
    raise SystemExit('records header anchor missing')
s = s.replace(header_anchor, cycle_notice, 1)
s = s.replace("item={item} canEdit={canEdit} canDelete={canDelete}", "item={item} canEdit={effectiveCanEdit} canDelete={effectiveCanDelete}")
p.write_text(s)
