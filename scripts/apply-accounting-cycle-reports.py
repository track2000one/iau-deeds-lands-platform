from pathlib import Path

# Reports page: allow printing/exporting any saved cycle, including archived history.
p = Path('src/app/pages/AccountingTransformationReportsPage.tsx')
s = p.read_text()
s = s.replace("import { useNavigate } from 'react-router';", "import { useNavigate, useSearchParams } from 'react-router';")
s = s.replace(
    "  downloadOfficialAccountingExcelTemplate,\n  getAccountingTransformationRecords,",
    "  downloadOfficialAccountingExcelTemplate,\n  getAccountingTransformationCycles,\n  getAccountingTransformationRecords,"
)
s = s.replace(
    "import type { AccountingTransformationRecord } from '../../types/accountingTransformation';",
    "import type { AccountingTransformationCycle, AccountingTransformationRecord } from '../../types/accountingTransformation';"
)
s = s.replace(
    "  const navigate = useNavigate();\n  const { isAdmin, hasPermission } = usePermissions();",
    "  const navigate = useNavigate();\n  const [searchParams, setSearchParams] = useSearchParams();\n  const { isAdmin, hasPermission } = usePermissions();"
)
state_anchor = "  const [sourceItems, setSourceItems] = useState<AccountingTransformationRecord[]>([]);\n"
if state_anchor not in s:
    raise SystemExit('reports state anchor not found')
s = s.replace(state_anchor, state_anchor + "  const [cycles, setCycles] = useState<AccountingTransformationCycle[]>([]);\n  const [selectedCycleId, setSelectedCycleId] = useState(searchParams.get('cycle') || '');\n")

second_effect_anchor = """  useEffect(() => {
    let cancelled = false; setTemplateLoading(true);
    getOfficialAccountingExcelTemplate().then((template) => { if (!cancelled) setOfficialTemplate(template); }).catch(() => { if (!cancelled) setOfficialTemplate(null); }).finally(() => { if (!cancelled) setTemplateLoading(false); });
    return () => { cancelled = true; };
  }, []);
"""
cycles_effect = second_effect_anchor + """
  useEffect(() => {
    let cancelled = false;
    getAccountingTransformationCycles()
      .then((data) => { if (!cancelled) setCycles(data || []); })
      .catch(() => { if (!cancelled) setCycles([]); });
    return () => { cancelled = true; };
  }, []);

  const selectedCycle = cycles.find((cycle) => cycle.id === selectedCycleId) || null;
"""
if second_effect_anchor not in s:
    raise SystemExit('reports template effect anchor missing')
s = s.replace(second_effect_anchor, cycles_effect)

s = s.replace(
    "getAccountingTransformationRecords({ search: appliedSearch, recordType, committeeStatus, all: true })",
    "getAccountingTransformationRecords({ search: appliedSearch, recordType, committeeStatus, cycleId: selectedCycleId || undefined, all: true })"
)
s = s.replace(
    "useEffect(() => { load(); }, [appliedSearch, recordType, committeeStatus]);",
    "useEffect(() => { load(); }, [appliedSearch, recordType, committeeStatus, selectedCycleId]);"
)
s = s.replace(
    "  useEffect(() => { setPage(1); }, [group, dateFrom, dateTo, sortKey, sortDirection, pageSize, selectedFields]);",
    "  useEffect(() => { setPage(1); }, [group, dateFrom, dateTo, sortKey, sortDirection, pageSize, selectedFields, selectedCycleId]);"
)

# Include cycle in printed report metadata.
old_meta = """<div class=\"meta\">النوع: ${escapeHtml(recordType === 'all' ? 'الكل' : ACCOUNTING_RECORD_TYPE_LABELS[recordType as AccountingRecordType])} | حالة اللجنة:"""
new_meta = """<div class=\"meta\">الدورة: ${escapeHtml(selectedCycle ? `#${selectedCycle.cycleNumber} — ${selectedCycle.name}` : 'الدورة الحالية المعتمدة')} | النوع: ${escapeHtml(recordType === 'all' ? 'الكل' : ACCOUNTING_RECORD_TYPE_LABELS[recordType as AccountingRecordType])} | حالة اللجنة:"""
if old_meta not in s:
    raise SystemExit('reports print metadata marker missing')
s = s.replace(old_meta, new_meta)

# Add selected cycle context below the report hero.
hero_anchor = """      </section>

      <div className=\"grid grid-cols-2 gap-3 md:grid-cols-5\">"""
cycle_context = """      </section>

      <div className={`print-hidden rounded-[22px] border p-4 ${selectedCycle?.status === 'archived' ? 'border-slate-300 bg-slate-50' : 'border-sky-200 bg-sky-50/60'}`}>
        <div className=\"grid gap-3 md:grid-cols-[1fr_auto] md:items-end\">
          <label className=\"text-xs font-bold text-slate-600\">إصدار البيانات المستخدم في التقرير
            <NativeSelect value={selectedCycleId} onChange={(e) => { const value = e.target.value; setSelectedCycleId(value); const next = new URLSearchParams(searchParams); if (value) next.set('cycle', value); else next.delete('cycle'); setSearchParams(next); setPage(1); }} className=\"mt-1 h-11 rounded-xl bg-white\">
              <option value=\"\">الدورة الحالية المعتمدة</option>
              {cycles.map((cycle) => <option key={cycle.id} value={cycle.id}>#{cycle.cycleNumber} — {cycle.name} {cycle.isCurrent ? '(الحالية)' : cycle.status === 'archived' ? '(مؤرشفة)' : cycle.status === 'under_review' ? '(تحت المراجعة)' : '(مسودة)'}</option>)}
            </NativeSelect>
          </label>
          <Button variant=\"outline\" onClick={() => navigate('/accounting-transformation/cycles')}>سجل دورات البيانات</Button>
        </div>
        <p className=\"mt-2 text-xs text-slate-600\">{selectedCycle ? `التقرير يعرض نسخة البيانات كما حُفظت في دورة: #${selectedCycle.cycleNumber} — ${selectedCycle.name}.` : 'التقرير يعرض آخر دورة معتمدة حاليًا.'}</p>
      </div>

      <div className=\"grid grid-cols-2 gap-3 md:grid-cols-5\">"""
if hero_anchor not in s:
    raise SystemExit('reports hero anchor missing')
s = s.replace(hero_anchor, cycle_context, 1)
p.write_text(s)

# Cycles page: direct report action for every version.
p = Path('src/app/pages/AccountingTransformationCyclesPage.tsx')
s = p.read_text()
view_button = "                  <Button size=\"sm\" variant=\"outline\" onClick={() => navigate(`/accounting-transformation/records?cycle=${encodeURIComponent(cycle.id)}`)}><FileSpreadsheet className=\"ml-1 h-4 w-4\" />عرض البيانات</Button>\n"
report_button = view_button + "                  <Button size=\"sm\" variant=\"outline\" onClick={() => navigate(`/accounting-transformation/reports?cycle=${encodeURIComponent(cycle.id)}`)}>تقرير الدورة</Button>\n"
if 'تقرير الدورة' not in s:
    if view_button not in s:
        raise SystemExit('cycle view button marker missing')
    s = s.replace(view_button, report_button)
p.write_text(s)
