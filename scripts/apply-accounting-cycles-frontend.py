from pathlib import Path

# Import page: only draft cycles accept data, improve comparison wording, and preserve source file name during preview.
p = Path('src/app/pages/AccountingTransformationImportPage.tsx')
s = p.read_text()
s = s.replace(
    "const open = (data || []).filter((cycle) => ['draft', 'under_review'].includes(cycle.status));",
    "const open = (data || []).filter((cycle) => cycle.status === 'draft');"
)
s = s.replace(
    "  const refreshScan = async (allItems: PreviewItem[]) => {",
    "  const refreshScan = async (allItems: PreviewItem[], sourceFileName = fileName) => {"
)
s = s.replace(
    "previewAccountingTransformationCycleImport(selectedCycleId, allItems.map(stripSource), fileName || undefined)",
    "previewAccountingTransformationCycleImport(selectedCycleId, allItems.map(stripSource), sourceFileName || undefined)"
)
s = s.replace("      await refreshScan(parsed);", "      await refreshScan(parsed, file.name);")
s = s.replace("      await refreshScan(items);", "      await refreshScan(items, fileName);")
s = s.replace(
    "`سيتم استيراد ${currentFreshRows.length.toLocaleString('ar-SA')} سجل جديد من ${batchLabel}.\\n\\n` +\n      'السجلات المكررة أو التي سبق استيرادها سيتم تجاوزها تلقائيًا. هل ترغب بالمتابعة؟'",
    "`سيتم حفظ ${currentFreshRows.length.toLocaleString('ar-SA')} سجل من ${batchLabel} داخل دورة التحديث الجديدة.\\n\\n` +\n      'سيحتفظ النظام بالنسخة السابقة كاملة، وسيصنف السجلات إلى جديد أو معدل أو بدون تغيير. هل ترغب بالمتابعة؟'"
)
s = s.replace(
    "({cycle.status === 'under_review' ? 'تحت المراجعة' : 'مسودة'})",
    "(مسودة)"
)
s = s.replace(
    "{cycles.length ? cycles.map((cycle) => <option key={cycle.id} value={cycle.id}>#{cycle.cycleNumber} — {cycle.name} (مسودة)</option>) : <option value=\"\">لا توجد دورة مفتوحة</option>}",
    "{cycles.length ? cycles.map((cycle) => <option key={cycle.id} value={cycle.id}>#{cycle.cycleNumber} — {cycle.name} (مسودة)</option>) : <option value=\"\">لا توجد دورة مسودة قابلة للاستيراد</option>}"
)
p.write_text(s)

# Dashboard: a review cycle is frozen, so route to cycle management instead of import.
p = Path('src/app/pages/AccountingTransformationDashboardPage.tsx')
s = p.read_text()
s = s.replace(
    "onClick={() => navigate(openCycle ? `/accounting-transformation/import?cycle=${encodeURIComponent(openCycle.id)}` : '/accounting-transformation/cycles')}",
    "onClick={() => navigate(openCycle?.status === 'draft' ? `/accounting-transformation/import?cycle=${encodeURIComponent(openCycle.id)}` : '/accounting-transformation/cycles')}"
)
s = s.replace(
    "{openCycle ? 'فتح دورة التحديث' : 'سجل الدورات'}",
    "{openCycle?.status === 'draft' ? 'فتح دورة التحديث' : 'سجل الدورات'}"
)
p.write_text(s)

# Cycles page: remove redundant comparison navigation; metrics are displayed in the card. Review cycles are frozen.
p = Path('src/app/pages/AccountingTransformationCyclesPage.tsx')
s = p.read_text()
s = s.replace("  FileDiff,\n", "")
s = s.replace(
    "<Button onClick={() => navigate(`/accounting-transformation/import?cycle=${encodeURIComponent(openCycle.id)}`)}><RefreshCcw className=\"ml-2 h-4 w-4\" />فتح دورة التحديث</Button>",
    "<Button onClick={() => navigate(openCycle.status === 'draft' ? `/accounting-transformation/import?cycle=${encodeURIComponent(openCycle.id)}` : '/accounting-transformation/cycles')}><RefreshCcw className=\"ml-2 h-4 w-4\" />{openCycle.status === 'draft' ? 'فتح دورة التحديث' : 'الدورة تحت المراجعة'}</Button>"
)
comparison_button = "                  {cycle.basedOnCycleId && cycle.recordCount > 0 && <Button size=\"sm\" variant=\"outline\" onClick={() => navigate(`/accounting-transformation/cycles?compare=${encodeURIComponent(cycle.id)}`)}><FileDiff className=\"ml-1 h-4 w-4\" />المقارنة</Button>}\n"
s = s.replace(comparison_button, "")
p.write_text(s)
